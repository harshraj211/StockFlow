import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config.js";
import { HttpError } from "./http.js";

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const extensionByContentType: Record<(typeof PRODUCT_IMAGE_CONTENT_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

let s3Client: S3Client | undefined;

function s3Settings() {
  if (!config.awsRegion || !config.awsS3Bucket) {
    throw new HttpError(503, "Product image storage is not configured");
  }
  return { region: config.awsRegion, bucket: config.awsS3Bucket };
}

function getS3Client() {
  const { region } = s3Settings();
  if (!s3Client) {
    const credentials =
      config.awsAccessKeyId && config.awsSecretAccessKey
        ? { accessKeyId: config.awsAccessKeyId, secretAccessKey: config.awsSecretAccessKey }
        : undefined;
    s3Client = new S3Client({ region, credentials });
  }
  return s3Client;
}

export function productImageStorageConfigured() {
  return Boolean(config.awsRegion && config.awsS3Bucket);
}

export function createProductImageKey(productId: string, contentType: (typeof PRODUCT_IMAGE_CONTENT_TYPES)[number]) {
  return `products/${productId}/${randomUUID()}.${extensionByContentType[contentType]}`;
}

export function assertProductImageKey(productId: string, imageKey: string) {
  if (!imageKey.startsWith(`products/${productId}/`) || imageKey.includes("..")) {
    throw new HttpError(400, "Invalid product image key");
  }
}

export async function createProductImageUploadUrl(imageKey: string, contentType: string) {
  const { bucket } = s3Settings();
  return getSignedUrl(
    getS3Client(),
    new PutObjectCommand({ Bucket: bucket, Key: imageKey, ContentType: contentType }),
    { expiresIn: 300 }
  );
}

export async function createProductImageReadUrl(imageKey: string) {
  const { bucket } = s3Settings();
  return getSignedUrl(getS3Client(), new GetObjectCommand({ Bucket: bucket, Key: imageKey }), { expiresIn: 3600 });
}

export async function inspectProductImage(imageKey: string) {
  const { bucket } = s3Settings();
  const object = await getS3Client().send(new HeadObjectCommand({ Bucket: bucket, Key: imageKey }));
  const contentType = object.ContentType ?? "";
  const contentLength = object.ContentLength ?? 0;
  if (!PRODUCT_IMAGE_CONTENT_TYPES.includes(contentType as (typeof PRODUCT_IMAGE_CONTENT_TYPES)[number])) {
    throw new HttpError(400, "Uploaded file must be JPEG, PNG, or WebP");
  }
  if (contentLength <= 0 || contentLength > MAX_PRODUCT_IMAGE_BYTES) {
    throw new HttpError(400, "Uploaded image must be 5 MB or smaller");
  }
  return { contentType, contentLength };
}

export async function deleteProductImage(imageKey: string) {
  const { bucket } = s3Settings();
  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: imageKey }));
}

export async function productWithImageUrl<T extends { imageKey: string | null }>(product: T) {
  return {
    ...product,
    imageUrl: product.imageKey && productImageStorageConfigured() ? await createProductImageReadUrl(product.imageKey) : null
  };
}

import axios from "axios";

export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Customer = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  type: "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
  priority: "HOT" | "WARM" | "COLD";
  address: string;
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  followUpDate?: string | null;
  notes?: string | null;
  followUps?: Array<{ id: string; note: string; createdAt: string; createdBy?: { name: string; role: Role } }>;
  challans?: Challan[];
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: string | number;
  currentStock: number;
  minimumStock: number;
  location: string;
  imageKey?: string | null;
  imageUrl?: string | null;
  movements?: StockMovement[];
};

export type StockMovement = {
  id: string;
  productId: string;
  quantity: number;
  type: "IN" | "OUT";
  reason: string;
  createdAt: string;
  createdBy?: { name: string; role: Role };
};

export type Challan = {
  id: string;
  challanNumber: string;
  customer: Customer;
  totalQuantity: number;
  totalAmount?: string | number;
  notes?: string | null;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
  confirmedAt?: string | null;
  createdBy?: { id?: string; name: string; role: Role };
  statusHistory?: Array<{
    id: string;
    fromStatus?: "DRAFT" | "CONFIRMED" | "CANCELLED" | null;
    toStatus: "DRAFT" | "CONFIRMED" | "CANCELLED";
    note?: string | null;
    createdAt: string;
    changedBy?: { name: string; role: Role };
  }>;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    category: string;
    unitPrice: string | number;
    location: string;
    quantity: number;
  }>;
};

export type DashboardStats = {
  customers: { total: number; active: number; leads: number; inactive: number };
  products: { total: number; healthyStock: number; lowStock: number; outOfStock: number };
  challans: { total: number; draft: number; confirmed: number; cancelled: number };
  revenue: { confirmedTotal: string | number };
  recentChallans: Challan[];
  lowStockList: Product[];
  upcomingFollowUps: Customer[];
};

export type ActivityLog = {
  id: string;
  action: string;
  entityType: "CUSTOMER" | "PRODUCT" | "CHALLAN" | "USER" | "SYSTEM";
  entityId?: string | null;
  title: string;
  details?: string | null;
  createdAt: string;
  createdBy?: { name: string; role: Role } | null;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export function isNetworkError(error: unknown) {
  return axios.isAxiosError(error) && !error.response;
}

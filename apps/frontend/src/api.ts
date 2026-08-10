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
  address: string;
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  followUpDate?: string | null;
  notes?: string | null;
  followUps?: Array<{ id: string; note: string; createdAt: string; createdBy?: { name: string; role: Role } }>;
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
  products: { total: number; lowStock: number };
  challans: { total: number; draft: number; confirmed: number; cancelled: number };
  revenue: { confirmedTotal: string | number };
  recentChallans: Challan[];
  lowStockList: Product[];
  upcomingFollowUps: Customer[];
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
  return "Something went wrong";
}

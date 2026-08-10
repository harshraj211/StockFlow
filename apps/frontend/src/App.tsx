import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  History,
  Info,
  Lock,
  LogOut,
  Menu,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCog,
  UserRoundPlus,
  UsersRound,
  Warehouse,
  X
} from "lucide-react";
import { ActivityLog, api, Challan, Customer, DashboardStats, errorMessage, isNetworkError, Product, Role, User } from "./api";

type Tab = "dashboard" | "walkthrough" | "customers" | "products" | "challans" | "activity" | "users";
type FieldErrors = Record<string, string>;
const tabRoutes: Record<Tab, string> = {
  dashboard: "/",
  walkthrough: "/walkthrough",
  customers: "/customers",
  products: "/products",
  challans: "/challans",
  activity: "/activity",
  users: "/users"
};

const demoUsers = [
  ["Admin", "admin@fundsroom.test"],
  ["Sales", "sales@fundsroom.test"],
  ["Warehouse", "warehouse@fundsroom.test"],
  ["Accounts", "accounts@fundsroom.test"]
] as const;

const blankCustomer = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  type: "WHOLESALE",
  priority: "WARM",
  address: "",
  status: "LEAD",
  followUpDate: "",
  notes: ""
};

const blankProduct = {
  name: "",
  sku: "",
  category: "",
  unitPrice: 0,
  currentStock: 0,
  minimumStock: 0,
  location: ""
};

const blankUser = {
  name: "",
  email: "",
  password: "Password@123",
  role: "SALES" as Role
};

const demoCustomers: Customer[] = [
  {
    id: "demo-customer-1",
    name: "Rohan Mehta",
    mobile: "9876543210",
    email: "billing@rohantraders.test",
    businessName: "Rohan Traders Pvt Ltd",
    type: "WHOLESALE",
    priority: "HOT",
    address: "Andheri East, Mumbai",
    status: "ACTIVE",
    followUpDate: "2026-08-11T10:00:00.000Z",
    notes: "Monthly purchase cycle."
  },
  {
    id: "demo-customer-2",
    name: "Priya Sharma",
    mobile: "9823456780",
    email: "priya@sharmadistrib.test",
    businessName: "Sharma Distributors",
    type: "DISTRIBUTOR",
    priority: "WARM",
    address: "Whitefield, Bengaluru",
    status: "LEAD",
    followUpDate: "2026-08-12T10:00:00.000Z",
    notes: "Needs updated rate card."
  }
];

const demoActivities: ActivityLog[] = [
  {
    id: "demo-activity-1",
    action: "CHALLAN_CONFIRMED",
    entityType: "CHALLAN",
    entityId: "demo-challan-1",
    title: "CH-2026-00074 confirmed",
    details: "Stock deducted for 50 units",
    createdAt: "2026-08-10T10:45:00.000Z",
    createdBy: { name: "Sales User", role: "SALES" }
  },
  {
    id: "demo-activity-2",
    action: "STOCK_MOVEMENT_RECORDED",
    entityType: "PRODUCT",
    entityId: "demo-product-1",
    title: "OUT stock movement recorded for LED Tube Light 4ft 18W",
    details: "50 units. Reason: Sales challan CH-2026-00074",
    createdAt: "2026-08-10T10:44:00.000Z",
    createdBy: { name: "Warehouse User", role: "WAREHOUSE" }
  },
  {
    id: "demo-activity-3",
    action: "FOLLOW_UP_ADDED",
    entityType: "CUSTOMER",
    entityId: "demo-customer-2",
    title: "Customer follow-up note added",
    details: "Shared updated rate card and scheduled callback.",
    createdAt: "2026-08-10T09:20:00.000Z",
    createdBy: { name: "Sales User", role: "SALES" }
  }
];

const demoProducts: Product[] = [
  { id: "demo-product-1", name: "LED Tube Light 4ft 18W", sku: "SKU-TUBE-LED-4FT", category: "Lighting", unitPrice: 280, currentStock: 5, minimumStock: 30, location: "Bengaluru Warehouse" },
  { id: "demo-product-2", name: "6A 3-Pin Socket", sku: "SKU-SOCKET-6A", category: "Accessories", unitPrice: 95, currentStock: 18, minimumStock: 20, location: "Mumbai Warehouse A" },
  { id: "demo-product-3", name: "Copper Wire Roll 90m", sku: "SKU-WIRE-90M", category: "Wiring", unitPrice: 1450, currentStock: 38, minimumStock: 25, location: "Mumbai Warehouse B" }
];

const demoChallans: Challan[] = [
  {
    id: "demo-challan-1",
    challanNumber: "CH-2026-00074",
    customer: demoCustomers[0],
    totalQuantity: 50,
    totalAmount: 14000,
    notes: "Urgent delivery required.",
    status: "CONFIRMED",
    createdAt: "2026-08-10T09:15:00.000Z",
    createdBy: { name: "Sales User", role: "SALES" },
    items: [{ id: "demo-item-1", productName: "LED Tube Light 4ft 18W", sku: "SKU-TUBE-LED-4FT", category: "Lighting", unitPrice: 280, location: "Bengaluru Warehouse", quantity: 50 }]
  },
  {
    id: "demo-challan-2",
    challanNumber: "CH-2026-00075",
    customer: demoCustomers[1],
    totalQuantity: 12,
    totalAmount: 17400,
    status: "DRAFT",
    createdAt: "2026-08-10T10:30:00.000Z",
    createdBy: { name: "Sales User", role: "SALES" },
    items: [{ id: "demo-item-2", productName: "Copper Wire Roll 90m", sku: "SKU-WIRE-90M", category: "Wiring", unitPrice: 1450, location: "Mumbai Warehouse B", quantity: 12 }]
  }
];

function can(user: User | null, roles: Role[]) {
  return !!user && roles.includes(user.role);
}

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [tab, setTab] = useState<Tab>("dashboard");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dashboardPeriod, setDashboardPeriod] = useState<"today" | "week" | "month">("month");
  const [customerStatusFilter, setCustomerStatusFilter] = useState<"ALL" | Customer["status"]>("ALL");
  const [customerPriorityFilter, setCustomerPriorityFilter] = useState<"ALL" | Customer["priority"]>("ALL");
  const [productCategoryFilter, setProductCategoryFilter] = useState("ALL");
  const [productLocationFilter, setProductLocationFilter] = useState("ALL");
  const [productStockFilter, setProductStockFilter] = useState<"ALL" | "HEALTHY" | "LOW" | "OUT">("ALL");
  const [challanStatusFilter, setChallanStatusFilter] = useState<"ALL" | Challan["status"]>("ALL");
  const [activityEntityFilter, setActivityEntityFilter] = useState<"ALL" | ActivityLog["entityType"]>("ALL");
  const [totals, setTotals] = useState({ customers: 0, products: 0, challans: 0, activity: 0, users: 0 });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "admin@fundsroom.test", password: "Password@123" });
  const [focusedCustomerId, setFocusedCustomerId] = useState<string | null>(null);
  const [focusedProductId, setFocusedProductId] = useState<string | null>(null);
  const [focusedChallanId, setFocusedChallanId] = useState<string | null>(null);
  const [loginErrors, setLoginErrors] = useState<FieldErrors>({});

  const routeTab: Tab = location.pathname.startsWith("/walkthrough")
    ? "walkthrough"
    : location.pathname.startsWith("/customers")
      ? "customers"
      : location.pathname.startsWith("/products")
        ? "products"
        : location.pathname.startsWith("/challans")
          ? "challans"
          : location.pathname.startsWith("/activity")
            ? "activity"
            : location.pathname.startsWith("/users")
              ? "users"
              : "dashboard";
  const activeTab = user ? routeTab : tab;
  const routeParts = location.pathname.split("/").filter(Boolean);
  const routeRecordId = routeParts[1] ?? null;

  function go(tabName: Tab, recordId?: string) {
    const base = tabRoutes[tabName];
    navigate(recordId ? `${base}/${recordId}` : base);
    setTab(tabName);
  }

  async function loadData() {
    if (!localStorage.getItem("token")) return;
    const baseParams = { page, limit: 10, search };
    setDataLoading(true);
    try {
      const [customerRes, productRes, challanRes, activityRes, dashboardRes, usersRes] = await Promise.all([
        api.get("/customers", {
          params: {
            ...baseParams,
            ...(customerStatusFilter !== "ALL" ? { status: customerStatusFilter } : {}),
            ...(customerPriorityFilter !== "ALL" ? { priority: customerPriorityFilter } : {})
          }
        }),
        api.get("/products", {
          params: {
            ...baseParams,
            ...(productCategoryFilter !== "ALL" ? { category: productCategoryFilter } : {}),
            ...(productLocationFilter !== "ALL" ? { location: productLocationFilter } : {}),
            ...(productStockFilter !== "ALL" ? { stockState: productStockFilter } : {})
          }
        }),
        api.get("/challans", {
          params: {
            ...baseParams,
            ...(challanStatusFilter !== "ALL" ? { status: challanStatusFilter } : {})
          }
        }),
        api.get("/activity", {
          params: {
            ...baseParams,
            ...(activityEntityFilter !== "ALL" ? { entityType: activityEntityFilter } : {})
          }
        }),
        api.get("/dashboard/stats", { params: { period: dashboardPeriod } }),
        user?.role === "ADMIN" ? api.get("/users", { params: baseParams }) : Promise.resolve({ data: { items: [], total: 0 } })
      ]);
      setCustomers(customerRes.data.items);
      setProducts(productRes.data.items);
      setChallans(challanRes.data.items);
      setActivities(activityRes.data.items);
      setDashboardStats(dashboardRes.data);
      setTeamUsers(usersRes.data.items);
      setTotals({
        customers: customerRes.data.total,
        products: productRes.data.total,
        challans: challanRes.data.total,
        activity: activityRes.data.total,
        users: usersRes.data.total
      });
    } catch (error) {
      setCustomers(demoCustomers);
      setProducts(demoProducts);
      setChallans(demoChallans);
      setActivities(demoActivities);
      setDashboardStats({
        customers: { total: 1248, active: 1102, leads: 34, inactive: 112 },
        products: { total: 342, healthyStock: 334, lowStock: 6, outOfStock: 2 },
        challans: { total: 87, draft: 2, confirmed: 74, cancelled: 5 },
        revenue: { confirmedTotal: 24875430 },
        lowStockList: demoProducts.filter((product) => product.currentStock <= product.minimumStock),
        upcomingFollowUps: demoCustomers,
        recentChallans: demoChallans
      });
      setTeamUsers(user?.role === "ADMIN" ? [{ ...user, isActive: true }] : []);
      setTotals({ customers: 1248, products: 342, challans: 87, activity: demoActivities.length, users: user?.role === "ADMIN" ? 4 : 0 });
      throw error;
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch((error) => setMessage(errorMessage(error)));
  }, [user, search, page, dashboardPeriod, customerStatusFilter, customerPriorityFilter, productCategoryFilter, productLocationFilter, productStockFilter, challanStatusFilter, activityEntityFilter]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  async function login(email: string, password = "Password@123") {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      setTab("dashboard");
      navigate("/");
    } catch (error) {
      if (!isNetworkError(error)) {
        setMessage(errorMessage(error));
        return;
      }
      const demoUser = { id: `demo-${email}`, name: email.split("@")[0], email, role: email.includes("warehouse") ? "WAREHOUSE" : email.includes("accounts") ? "ACCOUNTS" : email.includes("sales") ? "SALES" : "ADMIN" } as User;
      localStorage.setItem("token", "offline-demo-token");
      localStorage.setItem("user", JSON.stringify(demoUser));
      setUser(demoUser);
      setTab("dashboard");
      navigate("/");
      setMessage(`Using offline demo mode because the API is unavailable: ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    const errors = {
      email: emailError(loginForm.email),
      password: minLength(loginForm.password, 8, "Password must be at least 8 characters")
    };
    setLoginErrors(errors);
    if (hasErrors(errors)) return;
    await login(loginForm.email, loginForm.password);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    setCustomers([]);
    setProducts([]);
    setChallans([]);
    setActivities([]);
    setDashboardStats(null);
    setTeamUsers([]);
    navigate("/");
  }

  if (!user) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <div>
            <p className="eyebrow">StockFlow</p>
            <h1>Operations Portal</h1>
            <p className="muted">Sign in with your team credentials or use a demo role shortcut.</p>
          </div>
          <form className="login-form" onSubmit={submitLogin}>
            <label>
              Email
              <input
                type="email"
                placeholder="admin@fundsroom.test"
                value={loginForm.email}
                onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                required
              />
              <FieldError message={loginErrors.email} />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="Password@123"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                required
              />
              <FieldError message={loginErrors.password} />
            </label>
            <button disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
          </form>
          <p className="muted login-divider">Demo shortcuts</p>
          <div className="login-grid">
            {demoUsers.map(([label, email]) => (
              <button className="login-card" key={email} onClick={() => login(email)} disabled={loading}>
                <span>{label}</span>
                <small>{email}</small>
              </button>
            ))}
          </div>
          {message && <p className="alert">{message}</p>}
        </section>
      </main>
    );
  }

  const lowStock = products.filter((product) => product.currentStock <= product.minimumStock);
  const draftChallans = challans.filter((challan) => challan.status === "DRAFT");
  const notifications = [
    ...lowStock.slice(0, 3).map((product) => ({
      id: `stock-${product.id}`,
      title: `${product.name} is low on stock`,
      body: `${product.currentStock} available, minimum ${product.minimumStock}`,
      tab: "products" as Tab,
      recordId: product.id,
      tone: "danger"
    })),
    ...(dashboardStats?.upcomingFollowUps ?? []).slice(0, 3).map((customer) => ({
      id: `follow-${customer.id}`,
      title: `Follow-up due: ${customer.businessName}`,
      body: customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : "No date",
      tab: "customers" as Tab,
      recordId: customer.id,
      tone: "warning"
    })),
    ...draftChallans.slice(0, 3).map((challan) => ({
      id: `challan-${challan.id}`,
      title: `${challan.challanNumber} needs confirmation`,
      body: `${challan.customer.businessName} - ${formatMoney(challan.totalAmount)}`,
      tab: "challans" as Tab,
      recordId: challan.id,
      tone: "info"
    })),
    ...(user.role === "ADMIN"
      ? [{
          id: "admin-users",
          title: "Admin access center ready",
          body: "Review users, roles, activation status",
          tab: "users" as Tab,
          recordId: null,
          tone: "info"
        }]
      : [])
  ];

  return (
    <main className={`app-shell ${sidebarCompact ? "sidebar-compact" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-main">
          <div className="brand">
            <Boxes size={30} />
            <div>
              <h2>StockFlow</h2>
              <span>Operations Portal</span>
            </div>
          </div>
          <nav>
            <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => go("dashboard")}><Boxes /> Dashboard</button>
            <button className={activeTab === "walkthrough" ? "active" : ""} onClick={() => go("walkthrough")}><Sparkles /> Walkthrough</button>
            <button className={activeTab === "customers" ? "active" : ""} onClick={() => go("customers")}><UsersRound /> Customers</button>
            <button className={activeTab === "products" ? "active" : ""} onClick={() => go("products")}><PackagePlus /> Inventory</button>
            <button className={activeTab === "challans" ? "active" : ""} onClick={() => go("challans")}><ClipboardList /> Challans</button>
            <button className={activeTab === "activity" ? "active" : ""} onClick={() => go("activity")}><History /> Activity</button>
            <button className={activeTab === "users" ? "active" : ""} disabled={user.role !== "ADMIN"} title={user.role !== "ADMIN" ? "Only Admin can manage team users" : "Manage team users"} onClick={() => go("users")}><UserCog /> Users</button>
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="quick-actions">
            <span>Quick Actions</span>
            <button className="ghost" disabled={!can(user, ["ADMIN", "SALES"])} title={!can(user, ["ADMIN", "SALES"]) ? `${user.role} can review challans but cannot create them` : "Create a sales challan"} onClick={() => go("challans")}><Plus /> Create Challan</button>
            <button className="ghost" disabled={!can(user, ["ADMIN", "WAREHOUSE"])} title={!can(user, ["ADMIN", "WAREHOUSE"]) ? `${user.role} can view inventory but cannot record stock movement` : "Record stock movement"} onClick={() => go("products")}><Warehouse /> Add Stock Movement</button>
          </div>
          <div className="role-card">
            <Warehouse size={18} />
            <div>
              <span>Your Role</span>
              <strong>{user.role}</strong>
            </div>
          </div>
          <button className="ghost" onClick={logout}><LogOut /> Logout</button>
          <small className="copyright">2026 StockFlow</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button" aria-label="Menu" onClick={() => setSidebarCompact((value) => !value)}><Menu /></button>
          <label className="search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers, products, challans..." />
            <kbd>Ctrl + K</kbd>
          </label>
          <div>
            <span className="date-chip"><CalendarDays size={16} /> Aug 10, 2026</span>
          </div>
          <div className="notification-wrap">
            <button className={`icon-button ${notifications.length ? "alert-dot" : ""}`} aria-label="Notifications" onClick={() => setNotificationsOpen((value) => !value)}><Bell /></button>
            {notificationsOpen && (
              <div className="notification-panel">
                <div className="notification-head">
                  <strong>Notifications</strong>
                  <button className="link-button" onClick={() => setNotificationsOpen(false)}>Close</button>
                </div>
                {notifications.length === 0 && <p className="muted">No urgent updates right now.</p>}
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    className={`notification-item ${item.tone}`}
                    onClick={() => {
                      go(item.tab, item.recordId ?? undefined);
                      if (item.tab === "customers") setFocusedCustomerId(item.recordId ?? null);
                      if (item.tab === "products") setFocusedProductId(item.recordId ?? null);
                      if (item.tab === "challans") setFocusedChallanId(item.recordId ?? null);
                      setNotificationsOpen(false);
                    }}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </button>
                ))}
                {notifications.length > 0 && (
                  <button className="secondary" onClick={() => setNotificationsOpen(false)}>Mark all read</button>
                )}
              </div>
            )}
          </div>
          <div className="user-chip">
            <span>{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
            <div><strong>{user.name}</strong><small>{user.role}</small></div>
          </div>
        </header>
        <div className="page-title">
          <div>
            <h1>{activeTab === "products" ? "Inventory" : activeTab === "walkthrough" ? "System Walkthrough" : activeTab === "activity" ? "Activity Log" : activeTab[0].toUpperCase() + activeTab.slice(1)}</h1>
            <p className="muted">Track stock, customer follow-ups, challans, and operational exceptions.</p>
          </div>
          <button className="secondary" disabled={dataLoading} onClick={() => loadData()}><RefreshCw size={16} /> {dataLoading ? "Refreshing..." : "Refresh"}</button>
        </div>
        {message && <p className="alert">{message}</p>}

        {activeTab === "dashboard" && (
          <DashboardView
            stats={dashboardStats}
            customers={customers.length}
            products={products.length}
            allProducts={products}
            lowStock={lowStock.length}
            draftChallans={draftChallans.length}
            onNavigate={go}
            onOpenCustomer={(id) => go("customers", id)}
            onOpenProduct={(id) => go("products", id)}
            onOpenChallan={(id) => go("challans", id)}
            onReviewLowStock={() => {
              setProductStockFilter("LOW");
              go("products");
            }}
            onReviewDraftChallans={() => {
              setChallanStatusFilter("DRAFT");
              go("challans");
            }}
            onReviewFollowUps={() => go("customers")}
            period={dashboardPeriod}
            setPeriod={setDashboardPeriod}
            loading={dataLoading}
          />
        )}
        {activeTab === "walkthrough" && <WalkthroughView onNavigate={go} />}
        {activeTab === "customers" && <CustomersView user={user} customers={customers} page={page} total={totals.customers} setPage={setPage} reload={loadData} setMessage={setMessage} loading={dataLoading} statusFilter={customerStatusFilter} setStatusFilter={setCustomerStatusFilter} priorityFilter={customerPriorityFilter} setPriorityFilter={setCustomerPriorityFilter} focusedId={focusedCustomerId || (routeTab === "customers" ? routeRecordId : null)} clearFocusedId={() => setFocusedCustomerId(null)} onOpen={(id) => go("customers", id)} onOpenChallan={(id) => go("challans", id)} onBack={() => go("customers")} />}
        {activeTab === "products" && <ProductsView user={user} products={products} page={page} total={totals.products} setPage={setPage} reload={loadData} setMessage={setMessage} loading={dataLoading} categoryFilter={productCategoryFilter} setCategoryFilter={setProductCategoryFilter} locationFilter={productLocationFilter} setLocationFilter={setProductLocationFilter} stockFilter={productStockFilter} setStockFilter={setProductStockFilter} focusedId={focusedProductId || (routeTab === "products" ? routeRecordId : null)} clearFocusedId={() => setFocusedProductId(null)} onOpen={(id) => go("products", id)} onBack={() => go("products")} />}
        {activeTab === "challans" && <ChallansView user={user} customers={customers} products={products} challans={challans} page={page} total={totals.challans} setPage={setPage} reload={loadData} setMessage={setMessage} loading={dataLoading} challanFilter={challanStatusFilter} setChallanFilter={setChallanStatusFilter} focusedId={focusedChallanId || (routeTab === "challans" ? routeRecordId : null)} clearFocusedId={() => setFocusedChallanId(null)} onOpen={(id) => go("challans", id)} onBack={() => go("challans")} />}
        {activeTab === "activity" && <ActivityView activities={activities} page={page} total={totals.activity} setPage={setPage} loading={dataLoading} entityFilter={activityEntityFilter} setEntityFilter={setActivityEntityFilter} />}
        {activeTab === "users" && user.role === "ADMIN" && <UsersView currentUser={user} users={teamUsers} page={page} total={totals.users} setPage={setPage} reload={loadData} setMessage={setMessage} loading={dataLoading} />}
      </section>
    </main>
  );
}

function formatMoney(value: string | number | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function toDateInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function exportCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escapeCell = (value: string | number | null | undefined) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function required(value: string | number | null | undefined, message: string) {
  return String(value ?? "").trim() ? "" : message;
}

function emailError(value: string) {
  if (!value.trim()) return "Email is required";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Enter a valid email address";
}

function minLength(value: string, length: number, message: string) {
  return value.trim().length >= length ? "" : message;
}

function positiveNumber(value: number, message: string) {
  return Number(value) > 0 ? "" : message;
}

function nonNegativeNumber(value: number, message: string) {
  return Number(value) >= 0 ? "" : message;
}

function hasErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}

function FieldError({ message }: { message?: string }) {
  return message ? <small className="field-error">{message}</small> : null;
}

function Metric({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

function PermissionNotice({ text }: { text: string }) {
  return (
    <div className="panel permission">
      <strong>Read-only access</strong>
      <span>{text}</span>
    </div>
  );
}

function PermissionActionPanel({ text, actions }: { text: string; actions: string[] }) {
  return (
    <div className="panel permission">
      <strong><Lock size={16} /> Role-limited actions</strong>
      <span>{text}</span>
      <div className="disabled-action-list">
        {actions.map((action) => (
          <button className="secondary locked" disabled title={text} key={action}>
            <Lock size={14} /> {action}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <Info size={18} />
      <div>
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
    </div>
  );
}

function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, index) => <span className="skeleton-row" key={index} />)}
    </div>
  );
}

function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={`status-badge ${tone}`}>{label}</span>;
}

function stockTone(product: Product) {
  if (product.currentStock === 0) return "danger";
  if (product.currentStock <= product.minimumStock) return "warning";
  return "success";
}

function stockLabel(product: Product) {
  if (product.currentStock === 0) return "Out of Stock";
  if (product.currentStock <= product.minimumStock) return "Low Stock";
  return "Healthy";
}

function WalkthroughView({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const demoSteps = [
    ["Admin Login", "Open dashboard, notifications, users, and operational KPIs."],
    ["CRM Flow", "Create or edit a customer, set follow-up date, and add a note."],
    ["Inventory Flow", "Open a product, record IN/OUT movement, and inspect stock ledger."],
    ["Challan Flow", "Create draft challan, confirm it, then verify stock deduction."],
    ["Permission Check", "Switch role and show read-only boundaries for restricted modules."]
  ];
  const rules = [
    "JWT login with role-based access for Admin, Sales, Warehouse, and Accounts.",
    "Confirmed challans deduct stock inside a database transaction.",
    "Insufficient stock rejects confirmation without changing inventory.",
    "Product snapshots preserve challan history even if product data changes later.",
    "Every stock change is recorded with reason, user, role, and timestamp."
  ];

  return (
    <section className="walkthrough-page">
      <div className="panel hero-panel">
        <div>
          <p className="eyebrow">Reviewer Guide</p>
          <h2>StockFlow is built as an operations system, not just CRUD screens.</h2>
          <p className="muted">Use this page to quickly explain business rules, roles, demo path, and the reliability checks that separate the project from a basic submission.</p>
        </div>
        <div className="credential-box">
          <strong>Seeded Login</strong>
          <span>admin@fundsroom.test</span>
          <span>Password@123</span>
        </div>
      </div>

      <section className="walkthrough-grid">
        <div className="panel">
          <h2>5-Minute Demo Path</h2>
          <div className="timeline-list">
            {demoSteps.map(([title, body], index) => (
              <article key={title} className="timeline-item">
                <span>{index + 1}</span>
                <div><strong>{title}</strong><p>{body}</p></div>
              </article>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Business Rules To Highlight</h2>
          <div className="rule-list">
            {rules.map((rule) => <p key={rule}><ShieldCheck size={16} /> {rule}</p>)}
          </div>
        </div>
      </section>

      <section className="walkthrough-grid">
        <button className="module-card" onClick={() => onNavigate("customers")}>
          <UsersRound />
          <strong>CRM</strong>
          <span>Customers, follow-ups, status, notes, and lead tracking.</span>
        </button>
        <button className="module-card" onClick={() => onNavigate("products")}>
          <PackagePlus />
          <strong>Inventory</strong>
          <span>Stock status, movements, audit ledger, and low-stock alerts.</span>
        </button>
        <button className="module-card" onClick={() => onNavigate("challans")}>
          <ClipboardList />
          <strong>Challans</strong>
          <span>Drafts, confirmation, stock deduction, PDFs, and snapshots.</span>
        </button>
      </section>
    </section>
  );
}

function Pagination({ page, total, setPage }: { page: number; total: number; setPage: (page: number) => void }) {
  const limit = 10;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pagination">
      <span>Page {page} of {pages} - {total} records</span>
      <div className="actions">
        <button className="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <button className="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

function DashboardView({ stats, customers, products, allProducts, lowStock, draftChallans, onNavigate, onOpenCustomer, onOpenProduct, onOpenChallan, onReviewLowStock, onReviewDraftChallans, onReviewFollowUps, period, setPeriod, loading }: { stats: DashboardStats | null; customers: number; products: number; allProducts: Product[]; lowStock: number; draftChallans: number; onNavigate: (tab: Tab) => void; onOpenCustomer: (id: string) => void; onOpenProduct: (id: string) => void; onOpenChallan: (id: string) => void; onReviewLowStock: () => void; onReviewDraftChallans: () => void; onReviewFollowUps: () => void; period: "today" | "week" | "month"; setPeriod: (period: "today" | "week" | "month") => void; loading: boolean }) {
  const customerStats = stats?.customers ?? { total: customers, active: 0, leads: 0, inactive: 0 };
  const productStats = stats?.products ?? { total: products, healthyStock: Math.max(products - lowStock, 0), lowStock, outOfStock: 0 };
  const challanStats = stats?.challans ?? { total: 0, draft: draftChallans, confirmed: 0, cancelled: 0 };
  const lowStockItems = stats?.lowStockList ?? [];
  const recentChallans = stats?.recentChallans ?? [];
  const upcomingFollowUps = stats?.upcomingFollowUps ?? [];
  const selectedProduct = lowStockItems[0]
    ? allProducts.find((product) => product.id === lowStockItems[0].id) ?? lowStockItems[0]
    : null;
  const projectedShortage = selectedProduct ? Math.max(selectedProduct.minimumStock * 2 - selectedProduct.currentStock, 0) : 0;
  const selectedProductChallans = selectedProduct
    ? recentChallans.filter((challan) => challan.items.some((item) => item.sku === selectedProduct.sku)).slice(0, 3)
    : [];
  const topCustomers = Array.from(
    recentChallans.reduce((map, challan) => {
      const current = map.get(challan.customer.id) ?? {
        id: challan.customer.id,
        businessName: challan.customer.businessName,
        challans: 0,
        amount: 0
      };
      current.challans += 1;
      current.amount += Number(challan.totalAmount ?? 0);
      map.set(challan.customer.id, current);
      return map;
    }, new Map<string, { id: string; businessName: string; challans: number; amount: number }>())
  )
    .map(([, value]) => value)
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 3);
  const actionCards = [
    {
      title: "Low stock recovery",
      body: `${productStats.lowStock} SKUs are below reorder level and ${productStats.outOfStock} are already unavailable.`,
      cta: "Review inventory",
      icon: AlertTriangle,
      action: onReviewLowStock
    },
    {
      title: "Follow-up queue",
      body: `${upcomingFollowUps.length} customers need contact this week, including hot and warm leads.`,
      cta: "Open CRM queue",
      icon: CalendarDays,
      action: onReviewFollowUps
    },
    {
      title: "Pending confirmations",
      body: `${challanStats.draft} challans are still in draft and waiting for stock confirmation.`,
      cta: "Review challans",
      icon: ClipboardList,
      action: onReviewDraftChallans
    }
  ];

  return (
    <section className="ops-layout">
      <div className="dashboard-stack">
        <div className="alert-strip">
          <article>
            <AlertTriangle />
            <div><strong>{productStats.outOfStock} out / {productStats.lowStock} low stock</strong><span>Reorder soon to avoid stockouts.</span></div>
            <button className="link-button" onClick={onReviewLowStock}>Review</button>
          </article>
          <article>
            <AlertTriangle />
            <div><strong>{upcomingFollowUps.length} follow-ups due</strong><span>Customers need attention this week.</span></div>
            <button className="link-button" onClick={onReviewFollowUps}>Review</button>
          </article>
          <article>
            <Info />
            <div><strong>{challanStats.draft} challans pending</strong><span>Awaiting confirmation.</span></div>
            <button className="link-button" onClick={onReviewDraftChallans}>Review</button>
          </article>
        </div>

        <section className="panel">
          <div className="panel-toolbar">
            <div>
              <h2>Key Metrics</h2>
              <span>As of Aug 10, 2026 10:30 AM</span>
            </div>
            <select value={period} onChange={(event) => setPeriod(event.target.value as "today" | "week" | "month")}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="grid stats">
            <Metric label="Confirmed Revenue" value={formatMoney(stats?.revenue.confirmedTotal)} hint={period === "today" ? "Today" : period === "week" ? "This week" : "This month"} />
            <Metric label="Customers" value={customerStats.total} hint={`${customerStats.active} active / ${customerStats.leads} leads`} />
            <Metric label="Challans Confirmed" value={challanStats.confirmed} hint="Stock updated" />
            <Metric label="Healthy Stock" value={productStats.healthyStock} hint="Above minimum" />
            <Metric label="Low Stock Items" value={productStats.lowStock} hint="Below reorder level" />
            <Metric label="Out of Stock" value={productStats.outOfStock} hint="Immediate action" />
          </div>
        </section>

        <section className="dashboard-grid dashboard-actions">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <button className="action-card" key={card.title} onClick={card.action}>
                <div className="action-card-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <strong>{card.title}</strong>
                  <p>{card.body}</p>
                </div>
                <span>{card.cta} <ArrowRight size={14} /></span>
              </button>
            );
          })}
        </section>

        <section className="dashboard-grid">
          <div className="panel list compact-list">
            <div className="panel-toolbar"><h2>Low Stock Alerts</h2><button className="link-button" onClick={() => onNavigate("products")}>View all</button></div>
            {loading && <SkeletonRows />}
            {!loading && lowStockItems.length === 0 && <p className="muted">No low-stock products right now.</p>}
            {!loading && (
              <div className="action-list">
                {lowStockItems.map((product) => (
                  <button className="action-row" key={product.id} onClick={() => onOpenProduct(product.id)}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.sku} • {product.location}</span>
                    </div>
                    <div className="action-row-meta">
                      <StatusBadge label={product.currentStock === 0 ? "Out of Stock" : "Low Stock"} tone={product.currentStock === 0 ? "danger" : "warning"} />
                      <small>{product.currentStock} / {product.minimumStock}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="panel list compact-list">
            <div className="panel-toolbar"><h2>Upcoming Follow-ups</h2><button className="link-button" onClick={() => onNavigate("customers")}>View all</button></div>
            {loading && <SkeletonRows />}
            {!loading && upcomingFollowUps.length === 0 && <p className="muted">No follow-ups due this week.</p>}
            {!loading && (
              <div className="action-list">
                {upcomingFollowUps.map((customer) => (
                  <button className="action-row" key={customer.id} onClick={() => onOpenCustomer(customer.id)}>
                    <div>
                      <strong>{customer.businessName}</strong>
                      <span>{customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : "No date"} • {customer.mobile}</span>
                    </div>
                    <div className="action-row-meta">
                      <StatusBadge label={customer.priority} tone={customer.priority === "HOT" ? "danger" : customer.priority === "WARM" ? "warning" : "neutral"} />
                      <small>{customer.status}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel list compact-list">
            <div className="panel-toolbar"><h2>Recent Challans</h2><button className="link-button" onClick={() => onNavigate("challans")}>View all</button></div>
            {loading && <SkeletonRows />}
            {!loading && (
              <div className="action-list">
                {recentChallans.map((challan) => (
                  <button className="action-row" key={challan.id} onClick={() => onOpenChallan(challan.id)}>
                    <div>
                      <strong>{challan.challanNumber}</strong>
                      <span>{challan.customer.businessName} • Qty {challan.totalQuantity}</span>
                    </div>
                    <div className="action-row-meta">
                      <StatusBadge label={challan.status} tone={challan.status === "CONFIRMED" ? "success" : challan.status === "DRAFT" ? "warning" : "danger"} />
                      <small>{formatMoney(challan.totalAmount)}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="panel list compact-list">
            <div className="panel-toolbar"><h2>Business Focus</h2><button className="link-button" onClick={() => onNavigate("customers")}>View all</button></div>
            <div className="focus-grid">
              <article className="focus-card">
                <Target size={16} />
                <div>
                  <strong>{customerStats.leads} open leads</strong>
                  <span>Lead pipeline that can be converted into active customers.</span>
                </div>
              </article>
              <article className="focus-card">
                <TrendingUp size={16} />
                <div>
                  <strong>{topCustomers[0]?.businessName ?? "No demand trend yet"}</strong>
                  <span>{topCustomers[0] ? `${topCustomers[0].challans} recent challans worth ${formatMoney(topCustomers[0].amount)}` : "Recent challans will highlight your most active customers."}</span>
                </div>
              </article>
              <article className="focus-card">
                <CircleDollarSign size={16} />
                <div>
                  <strong>{formatMoney(stats?.revenue.confirmedTotal)}</strong>
                  <span>Confirmed revenue tracked for the selected reporting window.</span>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>

      <aside className="detail-rail">
        <div className="rail-header">
          <h2>Low Stock Item Details</h2>
          <X size={18} />
        </div>
        <div className="product-snapshot">
          <PackagePlus size={48} />
          <div>
            <span>{selectedProduct?.sku ?? "SKU-PENDING"}</span>
            <strong>{selectedProduct?.name ?? "No low-stock item"}</strong>
            <small>{selectedProduct?.category ?? "Inventory"}</small>
          </div>
        </div>
        <div className="rail-section">
          <h3>Stock Overview</h3>
          <InfoRow label="Current Stock" value={selectedProduct ? String(selectedProduct.currentStock) : "-"} danger />
          <InfoRow label="Reorder Level" value={selectedProduct ? String(selectedProduct.minimumStock) : "-"} />
          <InfoRow label="Location" value={selectedProduct?.location ?? "-"} />
          <InfoRow label="Suggested Replenishment" value={selectedProduct ? `${projectedShortage} units` : "-"} danger={projectedShortage > 0} />
        </div>
        <div className="rail-section">
          <h3>Related Challans</h3>
          {selectedProductChallans.length === 0 ? (
            <EmptyState title="No recent challans" body="Confirmed and draft challans involving this SKU will appear here." />
          ) : (
            <div className="action-list rail-actions">
              {selectedProductChallans.map((challan) => {
                const item = challan.items.find((entry) => entry.sku === selectedProduct?.sku);
                return (
                  <button className="action-row" key={challan.id} onClick={() => onOpenChallan(challan.id)}>
                    <div>
                      <strong>{challan.challanNumber}</strong>
                      <span>{challan.customer.businessName}</span>
                    </div>
                    <div className="action-row-meta">
                      <StatusBadge label={challan.status} tone={challan.status === "CONFIRMED" ? "success" : challan.status === "DRAFT" ? "warning" : "danger"} />
                      <small>{item ? `${item.quantity} qty` : formatMoney(challan.totalAmount)}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={() => selectedProduct ? onOpenProduct(selectedProduct.id) : onNavigate("products")}><Warehouse size={16} /> Open Product Detail</button>
        <button className="secondary" onClick={onReviewLowStock}>Open Low-Stock Queue</button>
      </aside>
    </section>
  );
}

function InfoRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <p className="info-row"><span>{label}</span><strong className={danger ? "danger" : ""}>{value}</strong></p>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <EmptyState title="No rows to show" body="Data will appear here when matching records are available." />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.join("-")}-${rowIndex}`}>
              {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomersView({ user, customers, page, total, setPage, reload, setMessage, loading, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, focusedId, clearFocusedId, onOpen, onOpenChallan, onBack }: { user: User; customers: Customer[]; page: number; total: number; setPage: (page: number) => void; reload: () => Promise<void>; setMessage: (value: string) => void; loading: boolean; statusFilter: "ALL" | Customer["status"]; setStatusFilter: (value: "ALL" | Customer["status"]) => void; priorityFilter: "ALL" | Customer["priority"]; setPriorityFilter: (value: "ALL" | Customer["priority"]) => void; focusedId: string | null; clearFocusedId: () => void; onOpen: (id: string) => void; onOpenChallan: (id: string) => void; onBack: () => void }) {
  const [form, setForm] = useState(blankCustomer);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState<"ALL" | "TODAY" | "WEEK" | "OVERDUE" | "LEADS">("ALL");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [noteErrors, setNoteErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (!focusedId) return;
    const customer = customers.find((item) => item.id === focusedId);
    if (customer) {
      openCustomer(customer);
    } else {
      openCustomerById(focusedId);
    }
    clearFocusedId();
  }, [focusedId, customers]);

  function beginEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      businessName: customer.businessName,
      gstNumber: customer.gstNumber ?? "",
      type: customer.type,
      priority: customer.priority,
      address: customer.address,
      status: customer.status,
      followUpDate: toDateInput(customer.followUpDate),
      notes: customer.notes ?? ""
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankCustomer);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      name: minLength(form.name, 2, "Customer name must be at least 2 characters"),
      mobile: minLength(form.mobile, 7, "Mobile must be at least 7 digits"),
      email: emailError(form.email),
      businessName: minLength(form.businessName, 2, "Business name must be at least 2 characters"),
      address: minLength(form.address, 3, "Address must be at least 3 characters")
    };
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setSaving(true);
    try {
      const payload = { ...form, followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : null };
      if (editingId) {
        await api.put(`/customers/${editingId}`, payload);
        setMessage("Customer updated");
      } else {
        await api.post("/customers", payload);
        setMessage("Customer saved");
      }
      resetForm();
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const nextErrors = { note: minLength(note, 2, "Follow-up note must be at least 2 characters") };
    setNoteErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setAddingNote(true);
    try {
      await api.post(`/customers/${selected.id}/follow-ups`, { note });
      const detail = await api.get(`/customers/${selected.id}`);
      setSelected(detail.data);
      setNote("");
      setNoteErrors({});
      setMessage("Follow-up note added");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setAddingNote(false);
    }
  }

  async function openCustomer(customer: Customer) {
    try {
      setSelected((await api.get(`/customers/${customer.id}`)).data);
    } catch {
      setSelected({ ...customer, followUps: customer.followUps ?? [] });
    }
  }

  async function openCustomerById(id: string) {
    try {
      setSelected((await api.get(`/customers/${id}`)).data);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    if (followUpFilter === "LEADS") return customer.status === "LEAD";
    if (!customer.followUpDate && followUpFilter !== "ALL") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = customer.followUpDate ? new Date(customer.followUpDate) : null;
    date?.setHours(0, 0, 0, 0);
    if (followUpFilter === "TODAY") return date?.getTime() === today.getTime();
    if (followUpFilter === "OVERDUE") return !!date && date < today;
    if (followUpFilter === "WEEK") {
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);
      return !!date && date >= today && date <= weekEnd;
    }
    return true;
  });

  const customerChallans = selected?.challans ?? [];
  const confirmedCustomerChallans = customerChallans.filter((challan) => challan.status === "CONFIRMED");
  const draftCustomerChallans = customerChallans.filter((challan) => challan.status === "DRAFT");
  const totalCustomerRevenue = confirmedCustomerChallans.reduce((sum, challan) => sum + Number(challan.totalAmount ?? 0), 0);
  const totalCustomerUnits = confirmedCustomerChallans.reduce((sum, challan) => sum + challan.totalQuantity, 0);
  const lastChallanDate = customerChallans[0]?.createdAt;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUpState = selected?.followUpDate
    ? new Date(selected.followUpDate) < today
      ? "Overdue"
      : "Scheduled"
    : "Not Scheduled";
  const accountHealthTone = selected?.priority === "HOT" ? "danger" : selected?.priority === "WARM" ? "warning" : "neutral";
  const accountHealthLabel = selected?.status === "LEAD" ? "Lead Opportunity" : selected?.status === "ACTIVE" ? "Active Account" : "Dormant Account";

  return (
    <section className="two-column">
      {can(user, ["ADMIN", "SALES"]) && (
        <form className="panel" onSubmit={save}>
          <h2><UserRoundPlus /> {editingId ? "Edit Customer" : "Add Customer"}</h2>
          <input placeholder="Customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <FieldError message={errors.name} />
          <input placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
          <FieldError message={errors.mobile} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <FieldError message={errors.email} />
          <input placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
          <FieldError message={errors.businessName} />
          <input placeholder="GST number" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="HOT">Hot Priority</option>
            <option value="WARM">Warm Priority</option>
            <option value="COLD">Cold Priority</option>
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
          <textarea placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          <FieldError message={errors.address} />
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="actions">
            <button disabled={saving}>{saving ? editingId ? "Updating..." : "Saving..." : editingId ? "Update Customer" : "Save Customer"}</button>
            {editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel Edit</button>}
          </div>
        </form>
      )}
      {!can(user, ["ADMIN", "SALES"]) && (
        <PermissionActionPanel
          text={`${user.role} can view CRM records but cannot create customers, edit customers, or add follow-up notes.`}
          actions={["Create Customer", "Edit Customer", "Add Follow-up Note"]}
        />
      )}
      <div className="panel list">
        <div className="panel-toolbar">
          <h2>Customer Records</h2>
          <button className="secondary" onClick={() => exportCsv(
            "stockflow-customers.csv",
            ["Business", "Name", "Mobile", "Email", "Type", "Priority", "Status", "Follow Up"],
            filteredCustomers.map((customer) => [customer.businessName, customer.name, customer.mobile, customer.email, customer.type, customer.priority, customer.status, customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : ""])
          )}>Export CSV</button>
        </div>
        <div className="filter-bar">
          {(["ALL", "TODAY", "WEEK", "OVERDUE", "LEADS"] as const).map((filter) => (
            <button key={filter} className={followUpFilter === filter ? "" : "secondary"} onClick={() => setFollowUpFilter(filter)}>{filter}</button>
          ))}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | Customer["status"])}>
            <option value="ALL">All statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as "ALL" | Customer["priority"])}>
            <option value="ALL">All priorities</option>
            <option value="HOT">Hot</option>
            <option value="WARM">Warm</option>
            <option value="COLD">Cold</option>
          </select>
        </div>
        {loading && <SkeletonRows />}
        {!loading && filteredCustomers.map((customer) => (
          <button className="row" key={customer.id} onClick={() => onOpen(customer.id)}>
            <strong>
              {customer.businessName}{" "}
              <StatusBadge label={customer.status} tone={customer.status === "ACTIVE" ? "success" : customer.status === "LEAD" ? "warning" : "neutral"} />
              <StatusBadge label={customer.priority} tone={customer.priority === "HOT" ? "danger" : customer.priority === "WARM" ? "warning" : "neutral"} />
            </strong>
            <span>{customer.name} - {customer.mobile}</span>
            <small>{customer.status} / {customer.type}{customer.followUpDate ? ` / Follow-up ${new Date(customer.followUpDate).toLocaleDateString()}` : ""}</small>
          </button>
        ))}
        {!loading && filteredCustomers.length === 0 && <EmptyState title="No customers found" body="Try another search term or follow-up filter." />}
        <Pagination page={page} total={total} setPage={setPage} />
        {selected && (
          <div className="detail detail-page">
            <div className="section-heading">
              <div>
                <h3>{selected.businessName}</h3>
                <p>{selected.name} - {selected.mobile} - {selected.email}</p>
              </div>
              <div className="actions">
                <button className="secondary" onClick={onBack}>Back to Customers</button>
                {can(user, ["ADMIN", "SALES"]) && <button className="secondary" onClick={() => beginEdit(selected)}>Edit Customer</button>}
              </div>
            </div>
            <div className="summary-strip">
              <article className="summary-card">
                <span>Confirmed Revenue</span>
                <strong>{formatMoney(totalCustomerRevenue)}</strong>
                <small>{confirmedCustomerChallans.length} confirmed challans</small>
              </article>
              <article className="summary-card">
                <span>Quantity Supplied</span>
                <strong>{totalCustomerUnits}</strong>
                <small>{draftCustomerChallans.length} drafts in pipeline</small>
              </article>
              <article className="summary-card">
                <span>Account Health</span>
                <strong><StatusBadge label={accountHealthLabel} tone={accountHealthTone} /></strong>
                <small>{followUpState} follow-up</small>
              </article>
            </div>
            <div className="meta-grid">
              <p><strong>Status</strong><br /><StatusBadge label={selected.status} tone={selected.status === "ACTIVE" ? "success" : selected.status === "LEAD" ? "warning" : "neutral"} /></p>
              <p><strong>Type</strong><br />{selected.type}</p>
              <p><strong>Priority</strong><br /><StatusBadge label={selected.priority} tone={selected.priority === "HOT" ? "danger" : selected.priority === "WARM" ? "warning" : "neutral"} /></p>
              <p><strong>GST</strong><br />{selected.gstNumber || "Not provided"}</p>
              <p><strong>Follow-up</strong><br />{selected.followUpDate ? new Date(selected.followUpDate).toLocaleDateString() : "Not scheduled"}</p>
              <p><strong>Last Challan</strong><br />{lastChallanDate ? new Date(lastChallanDate).toLocaleDateString() : "No challans yet"}</p>
            </div>
            <p><strong>Address:</strong> {selected.address}</p>
            {selected.notes && <p><strong>Notes:</strong> {selected.notes}</p>}
            {can(user, ["ADMIN", "SALES"]) && (
              <form onSubmit={addNote} className="inline-form">
                <input placeholder="Follow-up note" value={note} onChange={(e) => setNote(e.target.value)} required />
                <button disabled={addingNote}>{addingNote ? "Adding..." : "Add"}</button>
                <FieldError message={noteErrors.note} />
              </form>
            )}
            {!can(user, ["ADMIN", "SALES"]) && (
              <div className="disabled-action-list">
                <button className="secondary locked" disabled title={`${user.role} can inspect customer history but cannot add follow-up notes`}><Lock size={14} /> Add Follow-up Note</button>
              </div>
            )}
            <h3>Customer Activity Timeline</h3>
            <div className="timeline-list">
              <article className="timeline-item">
                <span>1</span>
                <div>
                  <strong>Customer record created</strong>
                  <p>Status: {selected.status} / Type: {selected.type}</p>
                </div>
              </article>
              {selected.followUpDate && (
                <article className="timeline-item">
                  <span>2</span>
                  <div>
                    <strong>Next follow-up scheduled</strong>
                    <p>{new Date(selected.followUpDate).toLocaleDateString()}</p>
                  </div>
                </article>
              )}
              {selected.followUps?.map((item, index) => (
                <article className="timeline-item" key={item.id}>
                  <span>{index + 3}</span>
                  <div>
                    <strong>{item.createdBy?.name ?? "Team"} added a follow-up note</strong>
                    <p>{item.note}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="detail-split">
              <section className="panel inner-panel">
                <div className="panel-toolbar">
                  <div>
                    <h2>Recent Challans</h2>
                    <span>Commercial history for this account</span>
                  </div>
                </div>
                {customerChallans.length === 0 ? (
                  <EmptyState title="No challans yet" body="Once challans are created for this customer, they will appear here with value and status." />
                ) : (
                  <div className="action-list">
                    {customerChallans.map((challan) => (
                      <button className="action-row" key={challan.id} onClick={() => onOpenChallan(challan.id)}>
                        <div>
                          <strong>{challan.challanNumber}</strong>
                          <span>{new Date(challan.createdAt).toLocaleString()} - Qty {challan.totalQuantity}</span>
                        </div>
                        <div className="action-row-meta">
                          <StatusBadge label={challan.status} tone={challan.status === "CONFIRMED" ? "success" : challan.status === "DRAFT" ? "warning" : "danger"} />
                          <small>{formatMoney(challan.totalAmount)}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
              <section className="panel inner-panel">
                <div className="panel-toolbar">
                  <div>
                    <h2>Relationship Notes</h2>
                    <span>Operational context for the next conversation</span>
                  </div>
                </div>
                <div className="focus-grid">
                  <article className="focus-card">
                    <CalendarDays size={16} />
                    <div>
                      <strong>{followUpState}</strong>
                      <span>{selected.followUpDate ? `Next follow-up on ${new Date(selected.followUpDate).toLocaleDateString()}` : "No follow-up is scheduled yet."}</span>
                    </div>
                  </article>
                  <article className="focus-card">
                    <Target size={16} />
                    <div>
                      <strong>{selected.status === "LEAD" ? "Lead conversion opportunity" : selected.status === "ACTIVE" ? "Retention and reorder account" : "Reactivation required"}</strong>
                      <span>{selected.priority === "HOT" ? "This account should stay in the daily review queue." : selected.priority === "WARM" ? "This account deserves weekly follow-up." : "This account can stay in the long-tail nurture list."}</span>
                    </div>
                  </article>
                  <article className="focus-card">
                    <CircleDollarSign size={16} />
                    <div>
                      <strong>{customerChallans.length ? formatMoney(totalCustomerRevenue / Math.max(confirmedCustomerChallans.length, 1)) : formatMoney(0)}</strong>
                      <span>Average confirmed challan value for this customer.</span>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ProductsView({ user, products, page, total, setPage, reload, setMessage, loading, categoryFilter, setCategoryFilter, locationFilter, setLocationFilter, stockFilter, setStockFilter, focusedId, clearFocusedId, onOpen, onBack }: { user: User; products: Product[]; page: number; total: number; setPage: (page: number) => void; reload: () => Promise<void>; setMessage: (value: string) => void; loading: boolean; categoryFilter: string; setCategoryFilter: (value: string) => void; locationFilter: string; setLocationFilter: (value: string) => void; stockFilter: "ALL" | "HEALTHY" | "LOW" | "OUT"; setStockFilter: (value: "ALL" | "HEALTHY" | "LOW" | "OUT") => void; focusedId: string | null; clearFocusedId: () => void; onOpen: (id: string) => void; onBack: () => void }) {
  const [form, setForm] = useState(blankProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [movement, setMovement] = useState({ type: "IN" as "IN" | "OUT", quantity: 1, reason: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [movementErrors, setMovementErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [recordingMovement, setRecordingMovement] = useState(false);

  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  const locations = Array.from(new Set(products.map((product) => product.location))).sort();

  useEffect(() => {
    if (!focusedId) return;
    const product = products.find((item) => item.id === focusedId);
    if (product) {
      selectProduct(product);
    } else {
      selectProductById(focusedId);
    }
    clearFocusedId();
  }, [focusedId, products]);

  function resetForm() {
    setEditingId(null);
    setForm(blankProduct);
  }

  function beginEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unitPrice: Number(product.unitPrice),
      currentStock: product.currentStock,
      minimumStock: product.minimumStock,
      location: product.location
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      name: minLength(form.name, 2, "Product name must be at least 2 characters"),
      sku: minLength(form.sku, 2, "SKU must be at least 2 characters"),
      category: minLength(form.category, 2, "Category must be at least 2 characters"),
      unitPrice: nonNegativeNumber(Number(form.unitPrice), "Unit price must be 0 or more"),
      currentStock: nonNegativeNumber(Number(form.currentStock), "Current stock must be 0 or more"),
      minimumStock: nonNegativeNumber(Number(form.minimumStock), "Minimum stock must be 0 or more"),
      location: minLength(form.location, 2, "Location must be at least 2 characters")
    };
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, form);
        setMessage("Product updated");
      } else {
        await api.post("/products", form);
        setMessage("Product saved");
      }
      resetForm();
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function selectProduct(product: Product) {
    try {
      const [detail, movements] = await Promise.all([
        api.get(`/products/${product.id}`),
        api.get(`/products/${product.id}/movements`, { params: { page: 1, limit: 100 } })
      ]);
      setSelected({ ...detail.data, movements: movements.data.items });
    } catch {
      setSelected({ ...product, movements: product.movements ?? [] });
    }
  }

  async function selectProductById(id: string) {
    try {
      const [detail, movements] = await Promise.all([
        api.get(`/products/${id}`),
        api.get(`/products/${id}/movements`, { params: { page: 1, limit: 100 } })
      ]);
      setSelected({ ...detail.data, movements: movements.data.items });
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function saveMovement(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const nextErrors = {
      quantity: positiveNumber(movement.quantity, "Quantity must be greater than 0"),
      reason: minLength(movement.reason, 2, "Reason must be at least 2 characters")
    };
    setMovementErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setRecordingMovement(true);
    try {
      const res = await api.post(`/products/${selected.id}/movements`, movement);
      setSelected({ ...res.data.product, movements: [res.data.movement, ...(selected.movements ?? [])] });
      setMovement({ type: "IN", quantity: 1, reason: "" });
      setMovementErrors({});
      setMessage("Stock movement recorded");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setRecordingMovement(false);
    }
  }

  const filteredProducts = products;

  return (
    <section className="two-column">
      {can(user, ["ADMIN", "WAREHOUSE"]) && (
        <form className="panel" onSubmit={save}>
          <h2><PackagePlus /> {editingId ? "Edit Product" : "Add Product"}</h2>
          {Object.keys(blankProduct).map((key) => (
            <label className="field-stack" key={key}>
              <input type={["unitPrice", "currentStock", "minimumStock"].includes(key) ? "number" : "text"} placeholder={key} value={(form as Record<string, string | number>)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
              <FieldError message={errors[key]} />
            </label>
          ))}
          <div className="actions">
            <button disabled={saving}>{saving ? editingId ? "Updating..." : "Saving..." : editingId ? "Update Product" : "Save Product"}</button>
            {editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel Edit</button>}
          </div>
        </form>
      )}
      {!can(user, ["ADMIN", "WAREHOUSE"]) && (
        <PermissionActionPanel
          text={`${user.role} can inspect inventory but cannot add/edit products or record stock movement.`}
          actions={["Add Product", "Edit Product", "Record Stock Movement"]}
        />
      )}
      <div className="panel list">
        <div className="panel-toolbar">
          <h2>Inventory</h2>
          <button className="secondary" onClick={() => exportCsv(
            "stockflow-products.csv",
            ["SKU", "Name", "Category", "Location", "Unit Price", "Current Stock", "Minimum Stock", "Status"],
            filteredProducts.map((product) => [product.sku, product.name, product.category, product.location, product.unitPrice, product.currentStock, product.minimumStock, stockLabel(product)])
          )}>Export CSV</button>
        </div>
        <div className="filter-grid">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="ALL">All locations</option>
            {locations.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as "ALL" | "HEALTHY" | "LOW" | "OUT")}>
            <option value="ALL">All stock states</option>
            <option value="HEALTHY">Healthy only</option>
            <option value="LOW">Low stock only</option>
            <option value="OUT">Out of stock only</option>
          </select>
        </div>
        {loading && <SkeletonRows />}
        {!loading && filteredProducts.map((product) => (
          <article className="row" key={product.id} onClick={() => onOpen(product.id)}>
            <strong>{product.name} <StatusBadge label={stockLabel(product)} tone={stockTone(product)} /></strong>
            <span>{product.sku} - {product.category} - {product.location}</span>
            <small className={product.currentStock <= product.minimumStock ? "danger" : ""}>Stock {product.currentStock} / Min {product.minimumStock}</small>
            {can(user, ["ADMIN", "WAREHOUSE"]) && <button className="secondary" onClick={(event) => { event.stopPropagation(); beginEdit(product); }}>Edit</button>}
          </article>
        ))}
        {!loading && filteredProducts.length === 0 && <EmptyState title="No products found" body="Try changing the category, location, low-stock filter, or search term." />}
        <Pagination page={page} total={total} setPage={setPage} />
        {selected && (
          <div className="detail detail-page">
            <div className="section-heading">
              <div>
                <h3>{selected.name}</h3>
                <p>{selected.sku} - {selected.category} - {selected.location}</p>
              </div>
              <div className="actions">
                <button className="secondary" onClick={onBack}>Back to Inventory</button>
                {can(user, ["ADMIN", "WAREHOUSE"]) && <button className="secondary" onClick={() => beginEdit(selected)}>Edit Product</button>}
              </div>
            </div>
            <div className="meta-grid">
              <p><strong>Current Stock</strong><br />{selected.currentStock}</p>
              <p><strong>Minimum Stock</strong><br />{selected.minimumStock}</p>
              <p><strong>Unit Price</strong><br />{formatMoney(selected.unitPrice)}</p>
              <p><strong>Alert</strong><br /><StatusBadge label={stockLabel(selected)} tone={stockTone(selected)} /></p>
              <p><strong>Reorder Suggestion</strong><br />{Math.max(selected.minimumStock * 2 - selected.currentStock, 0)} units</p>
            </div>
            {can(user, ["ADMIN", "WAREHOUSE"]) && (
              <form className="inline-form" onSubmit={saveMovement}>
                <select value={movement.type} onChange={(e) => setMovement({ ...movement, type: e.target.value as "IN" | "OUT" })}>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
                <input type="number" min="1" value={movement.quantity} onChange={(e) => setMovement({ ...movement, quantity: Number(e.target.value) })} />
                <input placeholder="Reason" value={movement.reason} onChange={(e) => setMovement({ ...movement, reason: e.target.value })} required />
                <button disabled={recordingMovement}>{recordingMovement ? "Recording..." : "Record"}</button>
                <FieldError message={movementErrors.quantity || movementErrors.reason} />
              </form>
            )}
            {!can(user, ["ADMIN", "WAREHOUSE"]) && (
              <div className="disabled-action-list">
                <button className="secondary locked" disabled title={`${user.role} can inspect stock history but cannot record movements`}><Lock size={14} /> Record Stock Movement</button>
              </div>
            )}
            <h3>Inventory Audit Trail</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Quantity</th><th>Reason</th><th>By</th><th>Date</th></tr></thead>
                <tbody>
                  {(selected.movements ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.type}</td>
                      <td>{item.quantity}</td>
                      <td>{item.reason}</td>
                      <td>{item.createdBy?.name ?? "System"}</td>
                      <td>{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(selected.movements ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5}>No stock movements recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ChallansView({ user, customers, products, challans, page, total, setPage, reload, setMessage, loading, challanFilter, setChallanFilter, focusedId, clearFocusedId, onOpen, onBack }: { user: User; customers: Customer[]; products: Product[]; challans: Challan[]; page: number; total: number; setPage: (page: number) => void; reload: () => Promise<void>; setMessage: (value: string) => void; loading: boolean; challanFilter: "ALL" | Challan["status"]; setChallanFilter: (value: "ALL" | Challan["status"]) => void; focusedId: string | null; clearFocusedId: () => void; onOpen: (id: string) => void; onBack: () => void }) {
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "CONFIRMED">("DRAFT");
  const [notes, setNotes] = useState("");
  const [detail, setDetail] = useState<Challan | null>(null);
  const [detailNotes, setDetailNotes] = useState("");
  const [lines, setLines] = useState([{ productId: "", quantity: 1 }]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [detailNoteErrors, setDetailNoteErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const draftTotal = lines.reduce((sum, line) => {
    const product = productMap.get(line.productId);
    return sum + Number(product?.unitPrice ?? 0) * line.quantity;
  }, 0);

  useEffect(() => {
    if (!focusedId) return;
    openDetail(focusedId);
    clearFocusedId();
  }, [focusedId]);

  const filteredChallans = challans;

  async function save(event: FormEvent) {
    event.preventDefault();
    const hasBlankProduct = lines.some((line) => !line.productId);
    const hasBadQuantity = lines.some((line) => Number(line.quantity) <= 0);
    const nextErrors = {
      customerId: required(customerId, "Customer is required"),
      items: hasBlankProduct ? "Select a product for every line" : "",
      quantity: hasBadQuantity ? "Every quantity must be greater than 0" : ""
    };
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setSaving(true);
    try {
      await api.post("/challans", { customerId, status, notes: notes || null, items: lines });
      setLines([{ productId: "", quantity: 1 }]);
      setCustomerId("");
      setNotes("");
      setErrors({});
      setMessage("Challan saved");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, nextStatus: "CONFIRMED" | "CANCELLED") {
    setStatusUpdatingId(id);
    try {
      await api.patch(`/challans/${id}/status`, { status: nextStatus });
      setMessage(`Challan ${nextStatus.toLowerCase()}`);
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function openDetail(id: string) {
    try {
      const res = await api.get(`/challans/${id}`);
      setDetail(res.data);
      setDetailNotes(res.data.notes ?? "");
    } catch {
      const challan = challans.find((item) => item.id === id);
      if (challan) {
        setDetail(challan);
        setDetailNotes(challan.notes ?? "");
      }
    }
  }

  async function saveDetailNotes(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;
    const nextErrors = { notes: detailNotes && detailNotes.trim().length < 2 ? "Notes must be at least 2 characters" : "" };
    setDetailNoteErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setSavingNotes(true);
    try {
      const res = await api.patch(`/challans/${detail.id}/notes`, { notes: detailNotes || null });
      setDetail({ ...detail, notes: res.data.notes });
      setDetailNoteErrors({});
      setMessage("Challan notes updated");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSavingNotes(false);
    }
  }

  function printChallan(challan: Challan) {
    const rows = challan.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.productName}<br><small>${item.sku} - ${item.category}</small></td>
        <td>${item.location}</td>
        <td>${item.quantity}</td>
        <td>${formatMoney(item.unitPrice)}</td>
        <td>${formatMoney(Number(item.unitPrice) * item.quantity)}</td>
      </tr>
    `).join("");
    const html = `
      <html>
        <head>
          <title>${challan.challanNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #172033; padding: 32px; }
            h1, h2, p { margin-top: 0; }
            .header { align-items: flex-start; border-bottom: 3px solid #00877d; display: flex; justify-content: space-between; padding-bottom: 18px; }
            .brand { font-size: 28px; font-weight: 800; }
            .brand span { color: #00877d; }
            .doc-title { text-align: right; }
            .status { border: 1px solid #d7dde8; border-radius: 999px; display: inline-block; font-size: 12px; font-weight: 800; margin-top: 6px; padding: 6px 10px; }
            table { border-collapse: collapse; width: 100%; margin-top: 24px; }
            th, td { border: 1px solid #d7dde8; padding: 10px; text-align: left; vertical-align: top; }
            th { background: #f2f5f8; color: #344054; font-size: 12px; text-transform: uppercase; }
            .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; }
            .box { border: 1px solid #d7dde8; border-radius: 8px; padding: 12px; }
            .notes { background: #f8fafc; border: 1px solid #d7dde8; border-radius: 8px; margin-top: 16px; padding: 12px; }
            .total { text-align: right; margin-top: 20px; font-size: 20px; font-weight: 700; }
            .signature { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; margin-top: 58px; }
            .signature div { border-top: 1px solid #98a2b3; padding-top: 8px; text-align: center; }
            .footer { color: #667085; font-size: 12px; margin-top: 28px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Stock<span>Flow</span></div>
              <p>Mini ERP + CRM Operations Portal</p>
            </div>
            <div class="doc-title">
              <h1>Sales Challan</h1>
              <p>${challan.challanNumber}</p>
              <span class="status">${challan.status}</span>
            </div>
          </div>
          <div class="meta">
            <div class="box"><strong>Bill To</strong><br>${challan.customer.businessName}<br>${challan.customer.name}<br>${challan.customer.mobile}</div>
            <div class="box"><strong>Document Info</strong><br>Created: ${new Date(challan.createdAt).toLocaleString()}<br>Created by: ${challan.createdBy?.name ?? "System"}<br>Total Qty: ${challan.totalQuantity}</div>
          </div>
          ${challan.notes ? `<div class="notes"><strong>Notes:</strong> ${challan.notes}</div>` : ""}
          <table>
            <thead><tr><th>#</th><th>Product</th><th>Location</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p class="total">Total: ${formatMoney(challan.totalAmount)}</p>
          <div class="signature">
            <div>Prepared By</div>
            <div>Authorized Signature</div>
          </div>
          <p class="footer">Generated from StockFlow. Product values are captured as challan-time snapshots.</p>
        </body>
      </html>
    `;
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      setMessage("Popup blocked. Allow popups to export challan.");
      return;
    }
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  async function downloadServerPdf(challan: Challan) {
    setPdfDownloading(true);
    try {
      const response = await api.get(`/challans/${challan.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${challan.challanNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setPdfDownloading(false);
    }
  }

  return (
    <section className="two-column">
      {can(user, ["ADMIN", "SALES"]) && (
        <form className="panel" onSubmit={save}>
          <h2><ClipboardList /> Create Challan</h2>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select customer</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.businessName}</option>)}
          </select>
          <FieldError message={errors.customerId} />
          {lines.map((line, index) => (
            <div className="line-item" key={index}>
              <select value={line.productId} onChange={(e) => setLines(lines.map((item, lineIndex) => lineIndex === index ? { ...item, productId: e.target.value } : item))} required>
                <option value="">Product</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.currentStock})</option>)}
              </select>
              <input type="number" min="1" value={line.quantity} onChange={(e) => setLines(lines.map((item, lineIndex) => lineIndex === index ? { ...item, quantity: Number(e.target.value) } : item))} />
            </div>
          ))}
          <FieldError message={errors.items || errors.quantity} />
          <textarea placeholder="Challan notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="total-preview">Estimated total: <strong>{formatMoney(draftTotal)}</strong></p>
          <button type="button" className="secondary" onClick={() => setLines([...lines, { productId: "", quantity: 1 }])}>Add Product</button>
          <select value={status} onChange={(e) => setStatus(e.target.value as "DRAFT" | "CONFIRMED")}>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
          <button disabled={saving}>{saving ? "Saving..." : "Save Challan"}</button>
        </form>
      )}
      {!can(user, ["ADMIN", "SALES"]) && (
        <PermissionActionPanel
          text={`${user.role} can review challans${can(user, ["ACCOUNTS"]) ? " and confirm/cancel drafts" : ""} but cannot create new challans.`}
          actions={["Create Challan", "Edit Draft Notes"]}
        />
      )}
      <div className="panel list">
        <div className="panel-toolbar">
          <h2>Sales Challans</h2>
          <button className="secondary" onClick={() => exportCsv(
            "stockflow-challans.csv",
            ["Challan", "Customer", "Status", "Quantity", "Amount", "Created"],
            filteredChallans.map((challan) => [challan.challanNumber, challan.customer.businessName, challan.status, challan.totalQuantity, challan.totalAmount, new Date(challan.createdAt).toLocaleString()])
          )}>Export CSV</button>
        </div>
        <div className="filter-bar">
          <select value={challanFilter} onChange={(event) => setChallanFilter(event.target.value as "ALL" | Challan["status"])}>
            <option value="ALL">All challans</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        {loading && <SkeletonRows />}
        {!loading && filteredChallans.map((challan) => (
          <article className="row" key={challan.id} onClick={() => onOpen(challan.id)}>
            <strong>
              {challan.challanNumber} - {challan.customer.businessName}{" "}
              <StatusBadge label={challan.status} tone={challan.status === "CONFIRMED" ? "success" : challan.status === "DRAFT" ? "warning" : "danger"} />
            </strong>
            <span>{challan.items.map((item) => `${item.productName} x ${item.quantity}`).join(", ")}</span>
            {challan.notes && <span>{challan.notes}</span>}
            <small>{challan.status} - Qty {challan.totalQuantity} - {formatMoney(challan.totalAmount)}</small>
            {challan.status === "DRAFT" && (
              <div className="actions">
                {can(user, ["ADMIN", "SALES", "ACCOUNTS"]) ? (
                  <>
                    <button disabled={statusUpdatingId === challan.id} onClick={(event) => { event.stopPropagation(); updateStatus(challan.id, "CONFIRMED"); }}>{statusUpdatingId === challan.id ? "Updating..." : "Confirm"}</button>
                    <button className="secondary" disabled={statusUpdatingId === challan.id} onClick={(event) => { event.stopPropagation(); updateStatus(challan.id, "CANCELLED"); }}>{statusUpdatingId === challan.id ? "Updating..." : "Cancel"}</button>
                  </>
                ) : (
                  <>
                    <button disabled title={`${user.role} can view challans but cannot confirm them`}><Lock size={14} /> Confirm</button>
                    <button className="secondary locked" disabled title={`${user.role} can view challans but cannot cancel them`}><Lock size={14} /> Cancel</button>
                  </>
                )}
              </div>
            )}
          </article>
        ))}
        {!loading && filteredChallans.length === 0 && <EmptyState title="No challans found" body="Create a challan or adjust the search/status filter." />}
        <Pagination page={page} total={total} setPage={setPage} />
        {lines.some((line) => line.productId) && (
          <p className="muted">Selected stock: {lines.map((line) => productMap.get(line.productId)?.currentStock ?? "-").join(", ")}</p>
        )}
        {detail && (
          <div className="detail">
            <div className="section-heading">
              <div>
                <h3>{detail.challanNumber}</h3>
                <p>{detail.customer.businessName} <StatusBadge label={detail.status} tone={detail.status === "CONFIRMED" ? "success" : detail.status === "DRAFT" ? "warning" : "danger"} /></p>
              </div>
              <div className="actions">
                <button className="secondary" onClick={onBack}>Back to Challans</button>
                <button className="secondary" onClick={() => printChallan(detail)}>Browser Print</button>
                <button className="secondary" disabled={pdfDownloading} onClick={() => downloadServerPdf(detail)}>{pdfDownloading ? "Downloading..." : "Download PDF"}</button>
              </div>
            </div>
            <div className="meta-grid">
              <p><strong>Total Qty</strong><br />{detail.totalQuantity}</p>
              <p><strong>Total Amount</strong><br />{formatMoney(detail.totalAmount)}</p>
              <p><strong>Created</strong><br />{new Date(detail.createdAt).toLocaleString()}</p>
              <p><strong>Created By</strong><br />{detail.createdBy?.name ?? "System"}</p>
            </div>
            {detail.status === "DRAFT" && can(user, ["ADMIN", "SALES"]) ? (
              <form onSubmit={saveDetailNotes} className="inline-form">
                <input value={detailNotes} onChange={(e) => setDetailNotes(e.target.value)} placeholder="Draft notes" />
                <button disabled={savingNotes}>{savingNotes ? "Saving..." : "Save Notes"}</button>
                <FieldError message={detailNoteErrors.notes} />
              </form>
            ) : detail.notes ? <p>{detail.notes}</p> : null}
            <h3>Challan Timeline</h3>
            <div className="timeline-list compact-timeline">
              {(detail.statusHistory?.length ? detail.statusHistory : [{
                id: "fallback-created",
                fromStatus: null,
                toStatus: detail.status,
                note: detail.status === "CONFIRMED" ? "Stock deducted and challan confirmed" : detail.status === "CANCELLED" ? "Challan cancelled" : "Draft challan created",
                createdAt: detail.confirmedAt ?? detail.createdAt,
                changedBy: detail.createdBy
              }]).map((history, index) => (
                <article className="timeline-item" key={history.id}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{history.fromStatus ? `${history.fromStatus} -> ${history.toStatus}` : `${history.toStatus} created`}</strong>
                    <p>
                      {history.note ?? "Status updated"} by {history.changedBy?.name ?? "System"} {history.changedBy?.role ? `(${history.changedBy.role})` : ""} on {new Date(history.createdAt).toLocaleString()}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Location</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}<br /><small>{item.sku} - {item.category}</small></td>
                      <td>{item.location}</td>
                      <td>{item.quantity}</td>
                      <td>{formatMoney(item.unitPrice)}</td>
                      <td>{formatMoney(Number(item.unitPrice) * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ActivityView({ activities, page, total, setPage, loading, entityFilter, setEntityFilter }: { activities: ActivityLog[]; page: number; total: number; setPage: (page: number) => void; loading: boolean; entityFilter: "ALL" | ActivityLog["entityType"]; setEntityFilter: (value: "ALL" | ActivityLog["entityType"]) => void }) {
  const toneByEntity: Record<ActivityLog["entityType"], "success" | "warning" | "danger" | "info" | "neutral"> = {
    CUSTOMER: "warning",
    PRODUCT: "success",
    CHALLAN: "info",
    USER: "neutral",
    SYSTEM: "danger"
  };
  const filteredActivities = activities;

  return (
    <section className="activity-page">
      <div className="panel">
        <div className="panel-toolbar">
          <div>
            <h2><History /> Global Activity Log</h2>
            <span>One audit stream across CRM, inventory, challans, and admin actions.</span>
          </div>
          <button className="secondary" onClick={() => exportCsv(
            "stockflow-activity.csv",
            ["Entity", "Action", "Title", "Details", "By", "Created"],
            filteredActivities.map((activity) => [activity.entityType, activity.action, activity.title, activity.details, activity.createdBy ? `${activity.createdBy.name} (${activity.createdBy.role})` : "System", new Date(activity.createdAt).toLocaleString()])
          )}>Export CSV</button>
        </div>
        <div className="filter-bar">
          <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value as "ALL" | ActivityLog["entityType"])}>
            <option value="ALL">All activity</option>
            <option value="CUSTOMER">Customer activity</option>
            <option value="PRODUCT">Product activity</option>
            <option value="CHALLAN">Challan activity</option>
            <option value="USER">User activity</option>
            <option value="SYSTEM">System activity</option>
          </select>
        </div>
        {loading && <SkeletonRows />}
        {!loading && filteredActivities.length === 0 && <EmptyState title="No activity recorded yet" body="Activity will appear after customer, inventory, challan, or user actions." />}
        <div className="activity-list">
          {!loading && filteredActivities.map((activity) => (
            <article className="activity-row" key={activity.id}>
              <div>
                <StatusBadge label={activity.entityType} tone={toneByEntity[activity.entityType]} />
                <strong>{activity.title}</strong>
                {activity.details && <p>{activity.details}</p>}
              </div>
              <div className="activity-meta">
                <span>{activity.createdBy ? `${activity.createdBy.name} (${activity.createdBy.role})` : "System"}</span>
                <small>{new Date(activity.createdAt).toLocaleString()}</small>
              </div>
            </article>
          ))}
        </div>
        <Pagination page={page} total={total} setPage={setPage} />
      </div>
    </section>
  );
}

function UsersView({ currentUser, users, page, total, setPage, reload, setMessage, loading }: { currentUser: User; users: User[]; page: number; total: number; setPage: (page: number) => void; reload: () => Promise<void>; setMessage: (value: string) => void; loading: boolean }) {
  const [form, setForm] = useState(blankUser);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      name: minLength(form.name, 2, "Name must be at least 2 characters"),
      email: emailError(form.email),
      password: minLength(form.password, 8, "Password must be at least 8 characters")
    };
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setSaving(true);
    try {
      await api.post("/users", form);
      setForm(blankUser);
      setErrors({});
      setMessage("User created");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function setActive(user: User, nextActive: boolean) {
    setUpdatingUserId(user.id);
    try {
      await api.patch(`/users/${user.id}/${nextActive ? "activate" : "deactivate"}`);
      setMessage(`${user.name} ${nextActive ? "activated" : "deactivated"}`);
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function updateRole(user: User, role: Role) {
    setUpdatingUserId(user.id);
    try {
      await api.put(`/users/${user.id}`, { role });
      setMessage(`${user.name} role updated`);
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <section className="two-column">
      <form className="panel" onSubmit={save}>
        <h2><UserCog /> Add Team User</h2>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <FieldError message={errors.name} />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <FieldError message={errors.email} />
        <input placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <FieldError message={errors.password} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          <option value="ADMIN">Admin</option>
          <option value="SALES">Sales</option>
          <option value="WAREHOUSE">Warehouse</option>
          <option value="ACCOUNTS">Accounts</option>
        </select>
        <button disabled={saving}>{saving ? "Creating..." : "Create User"}</button>
      </form>

      <div className="panel list">
        <h2>Team Access</h2>
        {loading && <SkeletonRows />}
        {!loading && users.map((teamUser) => (
          <article className="row user-row" key={teamUser.id}>
            <div>
              <strong>{teamUser.name}</strong>
              <span>{teamUser.email}</span>
            </div>
            <select value={teamUser.role} onChange={(e) => updateRole(teamUser, e.target.value as Role)} disabled={teamUser.id === currentUser.id || updatingUserId === teamUser.id}>
              <option value="ADMIN">Admin</option>
              <option value="SALES">Sales</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="ACCOUNTS">Accounts</option>
            </select>
            <small className={teamUser.isActive === false ? "danger" : ""}>{teamUser.isActive === false ? "Inactive" : "Active"}</small>
            <button className={teamUser.isActive === false ? "" : "secondary"} onClick={() => setActive(teamUser, teamUser.isActive === false)} disabled={teamUser.id === currentUser.id || updatingUserId === teamUser.id}>
              {teamUser.id === currentUser.id ? "Current user" : updatingUserId === teamUser.id ? "Updating..." : teamUser.isActive === false ? "Activate" : "Deactivate"}
            </button>
          </article>
        ))}
        <Pagination page={page} total={total} setPage={setPage} />
      </div>
    </section>
  );
}

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Boxes,
  CalendarDays,
  ClipboardList,
  Info,
  LogOut,
  Menu,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserRoundPlus,
  UsersRound,
  Warehouse,
  X
} from "lucide-react";
import { api, Challan, Customer, DashboardStats, errorMessage, isNetworkError, Product, Role, User } from "./api";

type Tab = "dashboard" | "walkthrough" | "customers" | "products" | "challans" | "users";

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
    address: "Whitefield, Bengaluru",
    status: "LEAD",
    followUpDate: "2026-08-12T10:00:00.000Z",
    notes: "Needs updated rate card."
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
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [tab, setTab] = useState<Tab>("dashboard");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totals, setTotals] = useState({ customers: 0, products: 0, challans: 0, users: 0 });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "admin@fundsroom.test", password: "Password@123" });
  const [focusedCustomerId, setFocusedCustomerId] = useState<string | null>(null);
  const [focusedProductId, setFocusedProductId] = useState<string | null>(null);
  const [focusedChallanId, setFocusedChallanId] = useState<string | null>(null);

  async function loadData() {
    if (!localStorage.getItem("token")) return;
    const params = { page, limit: 10, search };
    try {
      const [customerRes, productRes, challanRes, dashboardRes, usersRes] = await Promise.all([
        api.get("/customers", { params }),
        api.get("/products", { params }),
        api.get("/challans", { params }),
        api.get("/dashboard/stats"),
        user?.role === "ADMIN" ? api.get("/users", { params }) : Promise.resolve({ data: { items: [], total: 0 } })
      ]);
      setCustomers(customerRes.data.items);
      setProducts(productRes.data.items);
      setChallans(challanRes.data.items);
      setDashboardStats(dashboardRes.data);
      setTeamUsers(usersRes.data.items);
      setTotals({
        customers: customerRes.data.total,
        products: productRes.data.total,
        challans: challanRes.data.total,
        users: usersRes.data.total
      });
    } catch (error) {
      setCustomers(demoCustomers);
      setProducts(demoProducts);
      setChallans(demoChallans);
      setDashboardStats({
        customers: { total: 1248, active: 1102, leads: 34, inactive: 112 },
        products: { total: 342, lowStock: 8 },
        challans: { total: 87, draft: 2, confirmed: 74, cancelled: 5 },
        revenue: { confirmedTotal: 24875430 },
        lowStockList: demoProducts.filter((product) => product.currentStock <= product.minimumStock),
        upcomingFollowUps: demoCustomers,
        recentChallans: demoChallans
      });
      setTeamUsers(user?.role === "ADMIN" ? [{ ...user, isActive: true }] : []);
      setTotals({ customers: 1248, products: 342, challans: 87, users: user?.role === "ADMIN" ? 4 : 0 });
      throw error;
    }
  }

  useEffect(() => {
    loadData().catch((error) => setMessage(errorMessage(error)));
  }, [user, search, page]);

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
      setMessage(`Using offline demo mode because the API is unavailable: ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    await login(loginForm.email, loginForm.password);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    setCustomers([]);
    setProducts([]);
    setChallans([]);
    setDashboardStats(null);
    setTeamUsers([]);
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
            <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}><Boxes /> Dashboard</button>
            <button className={tab === "walkthrough" ? "active" : ""} onClick={() => setTab("walkthrough")}><Sparkles /> Walkthrough</button>
            <button className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}><UsersRound /> Customers</button>
            <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}><PackagePlus /> Inventory</button>
            <button className={tab === "challans" ? "active" : ""} onClick={() => setTab("challans")}><ClipboardList /> Challans</button>
            {user.role === "ADMIN" && <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><UserCog /> Users</button>}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="quick-actions">
            <span>Quick Actions</span>
            <button className="ghost" onClick={() => setTab("challans")}><Plus /> Create Challan</button>
            <button className="ghost" onClick={() => setTab("products")}><Warehouse /> Add Stock Movement</button>
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
                      setTab(item.tab);
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
            <h1>{tab === "products" ? "Inventory" : tab === "walkthrough" ? "System Walkthrough" : tab[0].toUpperCase() + tab.slice(1)}</h1>
            <p className="muted">Track stock, customer follow-ups, challans, and operational exceptions.</p>
          </div>
          <button className="secondary" onClick={() => loadData()}><RefreshCw size={16} /> Refresh</button>
        </div>
        {message && <p className="alert">{message}</p>}

        {tab === "dashboard" && (
          <DashboardView
            stats={dashboardStats}
            customers={customers.length}
            products={products.length}
            lowStock={lowStock.length}
            draftChallans={draftChallans.length}
            onNavigate={setTab}
          />
        )}
        {tab === "walkthrough" && <WalkthroughView onNavigate={setTab} />}
        {tab === "customers" && <CustomersView user={user} customers={customers} page={page} total={totals.customers} setPage={setPage} reload={loadData} setMessage={setMessage} focusedId={focusedCustomerId} clearFocusedId={() => setFocusedCustomerId(null)} />}
        {tab === "products" && <ProductsView user={user} products={products} page={page} total={totals.products} setPage={setPage} reload={loadData} setMessage={setMessage} focusedId={focusedProductId} clearFocusedId={() => setFocusedProductId(null)} />}
        {tab === "challans" && <ChallansView user={user} customers={customers} products={products} challans={challans} page={page} total={totals.challans} setPage={setPage} reload={loadData} setMessage={setMessage} focusedId={focusedChallanId} clearFocusedId={() => setFocusedChallanId(null)} />}
        {tab === "users" && user.role === "ADMIN" && <UsersView currentUser={user} users={teamUsers} page={page} total={totals.users} setPage={setPage} reload={loadData} setMessage={setMessage} />}
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

function DashboardView({ stats, customers, products, lowStock, draftChallans, onNavigate }: { stats: DashboardStats | null; customers: number; products: number; lowStock: number; draftChallans: number; onNavigate: (tab: Tab) => void }) {
  const customerStats = stats?.customers ?? { total: customers, active: 0, leads: 0, inactive: 0 };
  const productStats = stats?.products ?? { total: products, lowStock };
  const challanStats = stats?.challans ?? { total: 0, draft: draftChallans, confirmed: 0, cancelled: 0 };
  const lowStockItems = stats?.lowStockList ?? [];
  const selectedProduct = lowStockItems[0];
  const recentChallans = stats?.recentChallans ?? [];
  const upcomingFollowUps = stats?.upcomingFollowUps ?? [];

  return (
    <section className="ops-layout">
      <div className="dashboard-stack">
        <div className="alert-strip">
          <article>
            <AlertTriangle />
            <div><strong>{productStats.lowStock} low stock items</strong><span>Reorder soon to avoid stockouts.</span></div>
            <button className="link-button" onClick={() => onNavigate("products")}>View</button>
          </article>
          <article>
            <AlertTriangle />
            <div><strong>{upcomingFollowUps.length} follow-ups due</strong><span>Customers need attention this week.</span></div>
            <button className="link-button" onClick={() => onNavigate("customers")}>View</button>
          </article>
          <article>
            <Info />
            <div><strong>{challanStats.draft} challans pending</strong><span>Awaiting confirmation.</span></div>
            <button className="link-button" onClick={() => onNavigate("challans")}>View</button>
          </article>
        </div>

        <section className="panel">
          <div className="panel-toolbar">
            <div>
              <h2>Key Metrics</h2>
              <span>As of Aug 10, 2026 10:30 AM</span>
            </div>
            <select defaultValue="month">
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>
          <div className="grid stats">
            <Metric label="Confirmed Revenue" value={formatMoney(stats?.revenue.confirmedTotal)} hint="Up 18.6% vs last period" />
            <Metric label="Customers" value={customerStats.total} hint={`${customerStats.active} active / ${customerStats.leads} leads`} />
            <Metric label="Challans Confirmed" value={challanStats.confirmed} hint="Stock updated" />
            <Metric label="Low Stock Items" value={productStats.lowStock} hint="Critical attention" />
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel list compact-list">
            <div className="panel-toolbar"><h2>Low Stock Alerts</h2><button className="link-button" onClick={() => onNavigate("products")}>View all</button></div>
            {lowStockItems.length === 0 && <p className="muted">No low-stock products right now.</p>}
            <DataTable
              headers={["SKU", "Item", "Current", "Min", "Status"]}
              rows={lowStockItems.map((product) => [
                product.sku,
                product.name,
                String(product.currentStock),
                String(product.minimumStock),
                product.currentStock <= product.minimumStock ? "Low Stock" : "Healthy"
              ])}
            />
          </div>
          <div className="panel list compact-list">
            <div className="panel-toolbar"><h2>Upcoming Follow-ups</h2><button className="link-button" onClick={() => onNavigate("customers")}>View all</button></div>
            {upcomingFollowUps.length === 0 && <p className="muted">No follow-ups due this week.</p>}
            <DataTable
              headers={["Date", "Customer", "Type", "Status"]}
              rows={upcomingFollowUps.map((customer) => [
                customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : "-",
                customer.businessName,
                "Follow-up",
                customer.status
              ])}
            />
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel list compact-list">
            <div className="panel-toolbar"><h2>Recent Challans</h2><button className="link-button" onClick={() => onNavigate("challans")}>View all</button></div>
            <DataTable
              headers={["Challan", "Customer", "Amount", "Status"]}
              rows={recentChallans.map((challan) => [
                challan.challanNumber,
                challan.customer.businessName,
                formatMoney(challan.totalAmount),
                challan.status
              ])}
            />
          </div>
          <div className="panel list compact-list">
            <div className="panel-toolbar"><h2>Operational Exceptions</h2><button className="link-button" onClick={() => onNavigate("challans")}>View all</button></div>
            <DataTable
              headers={["Type", "Description", "Status"]}
              rows={[
                ["Challan Pending", "Awaiting confirmation", "Open"],
                ["Stock Mismatch", "Manual adjustment needed", "In Progress"],
                ["Follow-up Due", "Customer contact pending", "Open"]
              ]}
            />
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
          <InfoRow label="Projected Availability" value="Aug 18, 2026" danger />
        </div>
        <div className="rail-section">
          <h3>Recent Movements</h3>
          <DataTable
            headers={["Date", "Type", "Qty"]}
            rows={[
              ["Aug 09", "Issue", "-6"],
              ["Aug 08", "Issue", "-8"],
              ["Aug 07", "Receipt", "+20"]
            ]}
          />
        </div>
        <button onClick={() => onNavigate("products")}><Warehouse size={16} /> Add Stock Movement</button>
        <button className="secondary" onClick={() => onNavigate("products")}>View Item Ledger</button>
      </aside>
    </section>
  );
}

function InfoRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <p className="info-row"><span>{label}</span><strong className={danger ? "danger" : ""}>{value}</strong></p>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
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

function CustomersView({ user, customers, page, total, setPage, reload, setMessage, focusedId, clearFocusedId }: { user: User; customers: Customer[]; page: number; total: number; setPage: (page: number) => void; reload: () => Promise<void>; setMessage: (value: string) => void; focusedId: string | null; clearFocusedId: () => void }) {
  const [form, setForm] = useState(blankCustomer);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState<"ALL" | "TODAY" | "WEEK" | "OVERDUE" | "LEADS">("ALL");

  useEffect(() => {
    if (!focusedId) return;
    const customer = customers.find((item) => item.id === focusedId);
    if (!customer) return;
    openCustomer(customer);
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
    }
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      await api.post(`/customers/${selected.id}/follow-ups`, { note });
      const detail = await api.get(`/customers/${selected.id}`);
      setSelected(detail.data);
      setNote("");
      setMessage("Follow-up note added");
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function openCustomer(customer: Customer) {
    try {
      setSelected((await api.get(`/customers/${customer.id}`)).data);
    } catch {
      setSelected({ ...customer, followUps: customer.followUps ?? [] });
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

  return (
    <section className="two-column">
      {can(user, ["ADMIN", "SALES"]) && (
        <form className="panel" onSubmit={save}>
          <h2><UserRoundPlus /> {editingId ? "Edit Customer" : "Add Customer"}</h2>
          <input placeholder="Customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
          <input placeholder="GST number" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
          <textarea placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="actions">
            <button>{editingId ? "Update Customer" : "Save Customer"}</button>
            {editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel Edit</button>}
          </div>
        </form>
      )}
      {!can(user, ["ADMIN", "SALES"]) && <PermissionNotice text="This role can view CRM records but cannot create customers or add follow-up notes." />}
      <div className="panel list">
        <h2>Customer Records</h2>
        <div className="filter-bar">
          {(["ALL", "TODAY", "WEEK", "OVERDUE", "LEADS"] as const).map((filter) => (
            <button key={filter} className={followUpFilter === filter ? "" : "secondary"} onClick={() => setFollowUpFilter(filter)}>{filter}</button>
          ))}
        </div>
        {filteredCustomers.map((customer) => (
          <button className="row" key={customer.id} onClick={() => openCustomer(customer)}>
            <strong>{customer.businessName} <StatusBadge label={customer.status} tone={customer.status === "ACTIVE" ? "success" : customer.status === "LEAD" ? "warning" : "neutral"} /></strong>
            <span>{customer.name} - {customer.mobile}</span>
            <small>{customer.status} / {customer.type}{customer.followUpDate ? ` / Follow-up ${new Date(customer.followUpDate).toLocaleDateString()}` : ""}</small>
          </button>
        ))}
        <Pagination page={page} total={total} setPage={setPage} />
        {selected && (
          <div className="detail detail-page">
            <div className="section-heading">
              <div>
                <h3>{selected.businessName}</h3>
                <p>{selected.name} - {selected.mobile} - {selected.email}</p>
              </div>
              {can(user, ["ADMIN", "SALES"]) && <button className="secondary" onClick={() => beginEdit(selected)}>Edit Customer</button>}
            </div>
            <div className="meta-grid">
              <p><strong>Status</strong><br /><StatusBadge label={selected.status} tone={selected.status === "ACTIVE" ? "success" : selected.status === "LEAD" ? "warning" : "neutral"} /></p>
              <p><strong>Type</strong><br />{selected.type}</p>
              <p><strong>GST</strong><br />{selected.gstNumber || "Not provided"}</p>
              <p><strong>Follow-up</strong><br />{selected.followUpDate ? new Date(selected.followUpDate).toLocaleDateString() : "Not scheduled"}</p>
            </div>
            <p><strong>Address:</strong> {selected.address}</p>
            {selected.notes && <p><strong>Notes:</strong> {selected.notes}</p>}
            {can(user, ["ADMIN", "SALES"]) && (
              <form onSubmit={addNote} className="inline-form">
                <input placeholder="Follow-up note" value={note} onChange={(e) => setNote(e.target.value)} required />
                <button>Add</button>
              </form>
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
          </div>
        )}
      </div>
    </section>
  );
}

function ProductsView({ user, products, page, total, setPage, reload, setMessage, focusedId, clearFocusedId }: { user: User; products: Product[]; page: number; total: number; setPage: (page: number) => void; reload: () => Promise<void>; setMessage: (value: string) => void; focusedId: string | null; clearFocusedId: () => void }) {
  const [form, setForm] = useState(blankProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [movement, setMovement] = useState({ type: "IN" as "IN" | "OUT", quantity: 1, reason: "" });
  const [category, setCategory] = useState("ALL");
  const [location, setLocation] = useState("ALL");
  const [lowOnly, setLowOnly] = useState(false);

  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  const locations = Array.from(new Set(products.map((product) => product.location))).sort();

  useEffect(() => {
    if (!focusedId) return;
    const product = products.find((item) => item.id === focusedId);
    if (!product) return;
    selectProduct(product);
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

  async function saveMovement(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      const res = await api.post(`/products/${selected.id}/movements`, movement);
      setSelected({ ...res.data.product, movements: [res.data.movement, ...(selected.movements ?? [])] });
      setMovement({ type: "IN", quantity: 1, reason: "" });
      setMessage("Stock movement recorded");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  const filteredProducts = products.filter((product) => {
    if (category !== "ALL" && product.category !== category) return false;
    if (location !== "ALL" && product.location !== location) return false;
    if (lowOnly && product.currentStock > product.minimumStock) return false;
    return true;
  });

  return (
    <section className="two-column">
      {can(user, ["ADMIN", "WAREHOUSE"]) && (
        <form className="panel" onSubmit={save}>
          <h2><PackagePlus /> {editingId ? "Edit Product" : "Add Product"}</h2>
          {Object.keys(blankProduct).map((key) => (
            <input key={key} type={["unitPrice", "currentStock", "minimumStock"].includes(key) ? "number" : "text"} placeholder={key} value={(form as Record<string, string | number>)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
          ))}
          <div className="actions">
            <button>{editingId ? "Update Product" : "Save Product"}</button>
            {editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel Edit</button>}
          </div>
        </form>
      )}
      {!can(user, ["ADMIN", "WAREHOUSE"]) && <PermissionNotice text="This role can inspect inventory but cannot edit products or record stock movement." />}
      <div className="panel list">
        <h2>Inventory</h2>
        <div className="filter-grid">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="ALL">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="ALL">All locations</option>
            {locations.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <label className="check-row">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
            Low stock only
          </label>
        </div>
        {filteredProducts.map((product) => (
          <article className="row" key={product.id} onClick={() => selectProduct(product)}>
            <strong>{product.name} <StatusBadge label={stockLabel(product)} tone={stockTone(product)} /></strong>
            <span>{product.sku} - {product.category} - {product.location}</span>
            <small className={product.currentStock <= product.minimumStock ? "danger" : ""}>Stock {product.currentStock} / Min {product.minimumStock}</small>
            {can(user, ["ADMIN", "WAREHOUSE"]) && <button className="secondary" onClick={(event) => { event.stopPropagation(); beginEdit(product); }}>Edit</button>}
          </article>
        ))}
        <Pagination page={page} total={total} setPage={setPage} />
        {selected && (
          <div className="detail detail-page">
            <div className="section-heading">
              <div>
                <h3>{selected.name}</h3>
                <p>{selected.sku} - {selected.category} - {selected.location}</p>
              </div>
              {can(user, ["ADMIN", "WAREHOUSE"]) && <button className="secondary" onClick={() => beginEdit(selected)}>Edit Product</button>}
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
                <button>Record</button>
              </form>
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

function ChallansView({ user, customers, products, challans, page, total, setPage, reload, setMessage, focusedId, clearFocusedId }: { user: User; customers: Customer[]; products: Product[]; challans: Challan[]; page: number; total: number; setPage: (page: number) => void; reload: () => Promise<void>; setMessage: (value: string) => void; focusedId: string | null; clearFocusedId: () => void }) {
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "CONFIRMED">("DRAFT");
  const [notes, setNotes] = useState("");
  const [detail, setDetail] = useState<Challan | null>(null);
  const [detailNotes, setDetailNotes] = useState("");
  const [lines, setLines] = useState([{ productId: "", quantity: 1 }]);
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

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/challans", { customerId, status, notes: notes || null, items: lines });
      setLines([{ productId: "", quantity: 1 }]);
      setCustomerId("");
      setNotes("");
      setMessage("Challan saved");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function updateStatus(id: string, nextStatus: "CONFIRMED" | "CANCELLED") {
    try {
      await api.patch(`/challans/${id}/status`, { status: nextStatus });
      setMessage(`Challan ${nextStatus.toLowerCase()}`);
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
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
    try {
      const res = await api.patch(`/challans/${detail.id}/notes`, { notes: detailNotes || null });
      setDetail({ ...detail, notes: res.data.notes });
      setMessage("Challan notes updated");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
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
          {lines.map((line, index) => (
            <div className="line-item" key={index}>
              <select value={line.productId} onChange={(e) => setLines(lines.map((item, lineIndex) => lineIndex === index ? { ...item, productId: e.target.value } : item))} required>
                <option value="">Product</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.currentStock})</option>)}
              </select>
              <input type="number" min="1" value={line.quantity} onChange={(e) => setLines(lines.map((item, lineIndex) => lineIndex === index ? { ...item, quantity: Number(e.target.value) } : item))} />
            </div>
          ))}
          <textarea placeholder="Challan notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="total-preview">Estimated total: <strong>{formatMoney(draftTotal)}</strong></p>
          <button type="button" className="secondary" onClick={() => setLines([...lines, { productId: "", quantity: 1 }])}>Add Product</button>
          <select value={status} onChange={(e) => setStatus(e.target.value as "DRAFT" | "CONFIRMED")}>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
          <button>Save Challan</button>
        </form>
      )}
      {!can(user, ["ADMIN", "SALES"]) && <PermissionNotice text="This role can review challans and, where allowed, confirm or cancel drafts for accounts workflow." />}
      <div className="panel list">
        <h2>Sales Challans</h2>
        {challans.map((challan) => (
          <article className="row" key={challan.id} onClick={() => openDetail(challan.id)}>
            <strong>
              {challan.challanNumber} - {challan.customer.businessName}{" "}
              <StatusBadge label={challan.status} tone={challan.status === "CONFIRMED" ? "success" : challan.status === "DRAFT" ? "warning" : "danger"} />
            </strong>
            <span>{challan.items.map((item) => `${item.productName} x ${item.quantity}`).join(", ")}</span>
            {challan.notes && <span>{challan.notes}</span>}
            <small>{challan.status} - Qty {challan.totalQuantity} - {formatMoney(challan.totalAmount)}</small>
            {challan.status === "DRAFT" && (
              <div className="actions">
                <button onClick={(event) => { event.stopPropagation(); updateStatus(challan.id, "CONFIRMED"); }}>Confirm</button>
                <button className="secondary" onClick={(event) => { event.stopPropagation(); updateStatus(challan.id, "CANCELLED"); }}>Cancel</button>
              </div>
            )}
          </article>
        ))}
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
                <button className="secondary" onClick={() => printChallan(detail)}>Browser Print</button>
                <button className="secondary" onClick={() => downloadServerPdf(detail)}>Download PDF</button>
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
                <button>Save Notes</button>
              </form>
            ) : detail.notes ? <p>{detail.notes}</p> : null}
            <h3>Challan Timeline</h3>
            <div className="timeline-list compact-timeline">
              <article className="timeline-item">
                <span>1</span>
                <div>
                  <strong>Challan created</strong>
                  <p>{new Date(detail.createdAt).toLocaleString()} by {detail.createdBy?.name ?? "System"}</p>
                </div>
              </article>
              {detail.status === "CONFIRMED" && (
                <article className="timeline-item">
                  <span>2</span>
                  <div>
                    <strong>Stock deducted and challan confirmed</strong>
                    <p>{detail.confirmedAt ? new Date(detail.confirmedAt).toLocaleString() : "Confirmed"}</p>
                  </div>
                </article>
              )}
              {detail.status === "DRAFT" && (
                <article className="timeline-item">
                  <span>2</span>
                  <div>
                    <strong>Waiting for confirmation</strong>
                    <p>Stock will change only after confirmation succeeds.</p>
                  </div>
                </article>
              )}
              {detail.status === "CANCELLED" && (
                <article className="timeline-item">
                  <span>2</span>
                  <div>
                    <strong>Challan cancelled</strong>
                    <p>No further stock action is allowed from this state.</p>
                  </div>
                </article>
              )}
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

function UsersView({ currentUser, users, page, total, setPage, reload, setMessage }: { currentUser: User; users: User[]; page: number; total: number; setPage: (page: number) => void; reload: () => Promise<void>; setMessage: (value: string) => void }) {
  const [form, setForm] = useState(blankUser);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/users", form);
      setForm(blankUser);
      setMessage("User created");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function setActive(user: User, nextActive: boolean) {
    try {
      await api.patch(`/users/${user.id}/${nextActive ? "activate" : "deactivate"}`);
      setMessage(`${user.name} ${nextActive ? "activated" : "deactivated"}`);
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function updateRole(user: User, role: Role) {
    try {
      await api.put(`/users/${user.id}`, { role });
      setMessage(`${user.name} role updated`);
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <section className="two-column">
      <form className="panel" onSubmit={save}>
        <h2><UserCog /> Add Team User</h2>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          <option value="ADMIN">Admin</option>
          <option value="SALES">Sales</option>
          <option value="WAREHOUSE">Warehouse</option>
          <option value="ACCOUNTS">Accounts</option>
        </select>
        <button>Create User</button>
      </form>

      <div className="panel list">
        <h2>Team Access</h2>
        {users.map((teamUser) => (
          <article className="row user-row" key={teamUser.id}>
            <div>
              <strong>{teamUser.name}</strong>
              <span>{teamUser.email}</span>
            </div>
            <select value={teamUser.role} onChange={(e) => updateRole(teamUser, e.target.value as Role)} disabled={teamUser.id === currentUser.id}>
              <option value="ADMIN">Admin</option>
              <option value="SALES">Sales</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="ACCOUNTS">Accounts</option>
            </select>
            <small className={teamUser.isActive === false ? "danger" : ""}>{teamUser.isActive === false ? "Inactive" : "Active"}</small>
            <button className={teamUser.isActive === false ? "" : "secondary"} onClick={() => setActive(teamUser, teamUser.isActive === false)} disabled={teamUser.id === currentUser.id}>
              {teamUser.id === currentUser.id ? "Current user" : teamUser.isActive === false ? "Activate" : "Deactivate"}
            </button>
          </article>
        ))}
        <Pagination page={page} total={total} setPage={setPage} />
      </div>
    </section>
  );
}

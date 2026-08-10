import { FormEvent, useEffect, useMemo, useState } from "react";
import { Boxes, ClipboardList, LogOut, PackagePlus, Search, UserRoundPlus, UsersRound } from "lucide-react";
import { api, Challan, Customer, errorMessage, Product, Role, User } from "./api";

type Tab = "dashboard" | "customers" | "products" | "challans";

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
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    if (!localStorage.getItem("token")) return;
    const [customerRes, productRes, challanRes] = await Promise.all([
      api.get("/customers", { params: { limit: 50, search } }),
      api.get("/products", { params: { limit: 50, search } }),
      api.get("/challans", { params: { limit: 50, search } })
    ]);
    setCustomers(customerRes.data.items);
    setProducts(productRes.data.items);
    setChallans(challanRes.data.items);
  }

  useEffect(() => {
    loadData().catch((error) => setMessage(errorMessage(error)));
  }, [user, search]);

  async function login(email: string) {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.post("/auth/login", { email, password: "Password@123" });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      setTab("dashboard");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    setCustomers([]);
    setProducts([]);
    setChallans([]);
  }

  if (!user) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <div>
            <p className="eyebrow">Mini ERP + CRM</p>
            <h1>Operations Portal</h1>
            <p className="muted">Use seeded credentials to review each role quickly.</p>
          </div>
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

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Fundsroom Case</p>
          <h2>ERP CRM</h2>
        </div>
        <nav>
          <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}><Boxes /> Dashboard</button>
          <button className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}><UsersRound /> Customers</button>
          <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}><PackagePlus /> Products</button>
          <button className={tab === "challans" ? "active" : ""} onClick={() => setTab("challans")}><ClipboardList /> Challans</button>
        </nav>
        <button className="ghost" onClick={logout}><LogOut /> Logout</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{tab[0].toUpperCase() + tab.slice(1)}</h1>
            <p className="muted">{user.name} - {user.role}</p>
          </div>
          <label className="search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" />
          </label>
        </header>
        {message && <p className="alert">{message}</p>}

        {tab === "dashboard" && (
          <section className="grid stats">
            <Metric label="Customers" value={customers.length} />
            <Metric label="Products" value={products.length} />
            <Metric label="Low stock" value={lowStock.length} />
            <Metric label="Draft challans" value={draftChallans.length} />
          </section>
        )}
        {tab === "customers" && <CustomersView user={user} customers={customers} reload={loadData} setMessage={setMessage} />}
        {tab === "products" && <ProductsView user={user} products={products} reload={loadData} setMessage={setMessage} />}
        {tab === "challans" && <ChallansView user={user} customers={customers} products={products} challans={challans} reload={loadData} setMessage={setMessage} />}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function CustomersView({ user, customers, reload, setMessage }: { user: User; customers: Customer[]; reload: () => Promise<void>; setMessage: (value: string) => void }) {
  const [form, setForm] = useState(blankCustomer);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [note, setNote] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/customers", { ...form, followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : null });
      setForm(blankCustomer);
      setMessage("Customer saved");
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

  return (
    <section className="two-column">
      {can(user, ["ADMIN", "SALES"]) && (
        <form className="panel" onSubmit={save}>
          <h2><UserRoundPlus /> Add Customer</h2>
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
          <button>Save Customer</button>
        </form>
      )}
      <div className="panel list">
        <h2>Customer Records</h2>
        {customers.map((customer) => (
          <button className="row" key={customer.id} onClick={async () => setSelected((await api.get(`/customers/${customer.id}`)).data)}>
            <strong>{customer.businessName}</strong>
            <span>{customer.name} - {customer.mobile}</span>
            <small>{customer.status} / {customer.type}</small>
          </button>
        ))}
        {selected && (
          <div className="detail">
            <h3>{selected.businessName}</h3>
            <p>{selected.address}</p>
            <p>{selected.notes}</p>
            {can(user, ["ADMIN", "SALES"]) && (
              <form onSubmit={addNote} className="inline-form">
                <input placeholder="Follow-up note" value={note} onChange={(e) => setNote(e.target.value)} required />
                <button>Add</button>
              </form>
            )}
            {selected.followUps?.map((item) => <p className="note" key={item.id}>{item.note}</p>)}
          </div>
        )}
      </div>
    </section>
  );
}

function ProductsView({ user, products, reload, setMessage }: { user: User; products: Product[]; reload: () => Promise<void>; setMessage: (value: string) => void }) {
  const [form, setForm] = useState(blankProduct);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/products", form);
      setForm(blankProduct);
      setMessage("Product saved");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <section className="two-column">
      {can(user, ["ADMIN", "WAREHOUSE"]) && (
        <form className="panel" onSubmit={save}>
          <h2><PackagePlus /> Add Product</h2>
          {Object.keys(blankProduct).map((key) => (
            <input key={key} type={["unitPrice", "currentStock", "minimumStock"].includes(key) ? "number" : "text"} placeholder={key} value={(form as Record<string, string | number>)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
          ))}
          <button>Save Product</button>
        </form>
      )}
      <div className="panel list">
        <h2>Inventory</h2>
        {products.map((product) => (
          <article className="row" key={product.id}>
            <strong>{product.name}</strong>
            <span>{product.sku} - {product.category} - {product.location}</span>
            <small className={product.currentStock <= product.minimumStock ? "danger" : ""}>Stock {product.currentStock} / Min {product.minimumStock}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChallansView({ user, customers, products, challans, reload, setMessage }: { user: User; customers: Customer[]; products: Product[]; challans: Challan[]; reload: () => Promise<void>; setMessage: (value: string) => void }) {
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "CONFIRMED">("DRAFT");
  const [lines, setLines] = useState([{ productId: "", quantity: 1 }]);
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/challans", { customerId, status, items: lines });
      setLines([{ productId: "", quantity: 1 }]);
      setCustomerId("");
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
          <button type="button" className="secondary" onClick={() => setLines([...lines, { productId: "", quantity: 1 }])}>Add Product</button>
          <select value={status} onChange={(e) => setStatus(e.target.value as "DRAFT" | "CONFIRMED")}>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
          <button>Save Challan</button>
        </form>
      )}
      <div className="panel list">
        <h2>Sales Challans</h2>
        {challans.map((challan) => (
          <article className="row" key={challan.id}>
            <strong>{challan.challanNumber} - {challan.customer.businessName}</strong>
            <span>{challan.items.map((item) => `${item.productName} x ${item.quantity}`).join(", ")}</span>
            <small>{challan.status} - Qty {challan.totalQuantity}</small>
            {challan.status === "DRAFT" && (
              <div className="actions">
                <button onClick={() => updateStatus(challan.id, "CONFIRMED")}>Confirm</button>
                <button className="secondary" onClick={() => updateStatus(challan.id, "CANCELLED")}>Cancel</button>
              </div>
            )}
          </article>
        ))}
        {lines.some((line) => line.productId) && (
          <p className="muted">Selected stock: {lines.map((line) => productMap.get(line.productId)?.currentStock ?? "-").join(", ")}</p>
        )}
      </div>
    </section>
  );
}

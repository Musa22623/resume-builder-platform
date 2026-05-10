import { useEffect, useState } from "react";
import {
  ActionButton,
  ActionGroup,
  AdminTable,
  CheckboxField,
  Feedback,
  Field,
  SelectField,
  StatusPill,
  useAdminFeedback,
} from "../components/admin/AdminPrimitives";
import PageTitleBar from "../components/ui/PageTitleBar";
import Panel from "../components/ui/Panel";
import { useAuth } from "../context/AuthContext";
import api from "../services/api/client";
import { getUserDisplayName, getUserSecondaryText } from "../lib/userDisplay";

const sectionMeta = {
  overview: {
    title: "Admin Overview",
    subtitle: "Operational totals, access state, billing health, and recent admin activity.",
  },
  users: {
    title: "Users",
    subtitle: "Search users, review access state, and adjust role or active status.",
  },
  plans: {
    title: "Plans",
    subtitle: "Create, edit, activate, deactivate, and archive paid plans.",
  },
  trial: {
    title: "Trial Settings",
    subtitle: "Configure default trial availability and duration for new users.",
  },
  "crypto-networks": {
    title: "Crypto Networks",
    subtitle: "Manage supported stablecoin networks and QR payload templates.",
  },
  "crypto-wallets": {
    title: "Crypto Wallets",
    subtitle: "Manage public receiving wallets attached to supported networks.",
  },
  "crypto-availability": {
    title: "Plan Crypto Availability",
    subtitle: "Control which crypto networks are enabled for each plan.",
  },
  "crypto-reviews": {
    title: "Crypto Payment Reviews",
    subtitle: "Review submitted transaction hashes and approve or reject entitlement grants.",
  },
  logs: {
    title: "Action Logs",
    subtitle: "Audit user, plan, trial, support, and crypto changes made by admins.",
  },
};

const defaultPlanForm = {
  name: "",
  plan_type: "monthly",
  price_usd: "",
  currency: "USD",
  billing_interval: "month",
  stripe_price_id: "",
  stripe_product_id: "",
  display_order: 0,
  active: true,
  is_archived: false,
};

const defaultNetworkForm = {
  code: "",
  display_name: "",
  token_symbol: "USDT",
  network_name: "",
  sort_order: 0,
  qr_payload_template: "",
  is_active: true,
};

const defaultWalletForm = {
  network: "",
  label: "",
  address: "",
  qr_payload_override: "",
  is_public: true,
  is_active: true,
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const money = (value, currency = "USD") => {
  if (value === undefined || value === null || value === "") return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "-";
  return `${currency} ${amount.toFixed(2)}`;
};

// Admin APIs are mostly paginated, but a few maintenance endpoints still return plain arrays.
const toArray = (payload) => (Array.isArray(payload) ? payload : payload?.items || []);

const formatPayloadSnippet = (payload) => {
  if (!payload || Object.keys(payload).length === 0) return "-";
  return JSON.stringify(payload);
};

const AdminPage = ({ section = "overview" }) => {
  const meta = sectionMeta[section] || sectionMeta.overview;

  return (
    <div className="space-y-5">
      <PageTitleBar subtitle={meta.subtitle} title={meta.title} />
      {section === "overview" ? <OverviewSection /> : null}
      {section === "users" ? <UsersSection /> : null}
      {section === "plans" ? <PlansSection /> : null}
      {section === "trial" ? <TrialSection /> : null}
      {section === "crypto-networks" ? <CryptoNetworksSection /> : null}
      {section === "crypto-wallets" ? <CryptoWalletsSection /> : null}
      {section === "crypto-availability" ? <CryptoAvailabilitySection /> : null}
      {section === "crypto-reviews" ? <CryptoReviewsSection /> : null}
      {section === "logs" ? <LogsSection /> : null}
    </div>
  );
};

const OverviewSection = () => {
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get("/api/v1/admin/overview/"),
      api.get("/api/v1/admin/action-logs/"),
    ])
      .then(([overviewResponse, logsResponse]) => {
        if (!mounted) return;
        setOverview(overviewResponse.data);
        setLogs(toArray(logsResponse.data).slice(0, 8));
      })
      .catch(() => {
        if (mounted) {
          setOverview(null);
          setLogs([]);
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = [
    { label: "Users", value: overview?.users?.total ?? "-", note: `${overview?.users?.active ?? 0} active` },
    { label: "Trial Access", value: overview?.access?.trial ?? "-", note: `${overview?.access?.subscription ?? 0} paid` },
    { label: "Payments", value: overview?.billing?.payments_total ?? "-", note: `${overview?.billing?.payments_paid ?? 0} paid` },
    { label: "AI Generations", value: overview?.ai?.generations_total ?? "-", note: `${overview?.ai?.generations_failed ?? 0} failed` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Panel className="p-4" key={metric.label}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{isLoading ? "..." : metric.value}</p>
            <p className="mt-1 text-sm text-slate-500">{metric.note}</p>
          </Panel>
        ))}
      </div>
      <Panel className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">Recent Admin Activity</h2>
          <StatusPill tone="slate">{logs.length} latest</StatusPill>
        </div>
        <AdminTable
          columns={[
            { key: "action_type", label: "Action" },
            { key: "actor_email", label: "Actor" },
            { key: "target", label: "Target", render: (row) => `${row.target_type || "-"} #${row.target_id || "-"}` },
            { key: "created_at", label: "Time", render: (row) => formatDateTime(row.created_at) },
          ]}
          empty="No admin activity yet."
          rows={logs}
        />
      </Panel>
    </div>
  );
};

const UsersSection = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: "", role: "", is_active: "", access_type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { feedback, setFeedback, showError, showSuccess } = useAdminFeedback();

  const loadUsers = () => {
    setIsLoading(true);
    api.get("/api/v1/admin/users/", { params: filters })
      .then(({ data }) => setUsers(toArray(data)))
      .catch((error) => {
        setUsers([]);
        showError(error, "Failed to load users.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateUser = async (user, payload) => {
    if (currentUser && String(user.id) === String(currentUser.id)) {
      setFeedback({ tone: "error", message: "You cannot change your own role or active status from this page." });
      return;
    }

    try {
      const { data } = await api.patch(`/api/v1/admin/users/${user.id}/`, payload);
      const nextUser = data.user || data;
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, ...nextUser } : item)));
      showSuccess("User updated.");
    } catch (error) {
      showError(error, "Failed to update user.");
    }
  };

  return (
    <div className="space-y-4">
      <Feedback feedback={feedback} />
      <Panel className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] lg:items-end">
          <Field label="Search" onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Email or name" value={filters.search} />
          <SelectField label="Role" onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))} value={filters.role}>
            <option value="">All</option>
            <option value="ADMIN">Admin</option>
            <option value="USER">User</option>
          </SelectField>
          <SelectField label="Active" onChange={(event) => setFilters((current) => ({ ...current, is_active: event.target.value }))} value={filters.is_active}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </SelectField>
          <SelectField label="Access" onChange={(event) => setFilters((current) => ({ ...current, access_type: event.target.value }))} value={filters.access_type}>
            <option value="">All</option>
            <option value="trial">Trial</option>
            <option value="subscription">Subscription</option>
            <option value="none">None</option>
          </SelectField>
          <button className="rb-btn-dark h-10" onClick={loadUsers} type="button">{isLoading ? "Loading..." : "Apply"}</button>
        </div>
      </Panel>
      <Panel className="p-4">
        <AdminTable
          columns={[
            {
              key: "user",
              label: "User",
              render: (user) => (
                <div>
                  <p className="font-semibold text-slate-950">{getUserDisplayName(user)}</p>
                  <p className="mt-1 text-xs text-slate-500">{getUserSecondaryText(user) || `User #${user.id}`}</p>
                </div>
              ),
            },
            { key: "role", label: "Role", render: (user) => <StatusPill tone={user.role === "ADMIN" ? "teal" : "slate"}>{user.role}</StatusPill> },
            { key: "active", label: "Active", render: (user) => <StatusPill tone={user.is_active ? "green" : "red"}>{user.is_active ? "Active" : "Inactive"}</StatusPill> },
            { key: "access", label: "Access", render: (user) => <StatusPill tone={user.access_state?.has_access ? "green" : "amber"}>{user.access_state?.access_type || "none"}</StatusPill> },
            { key: "created_at", label: "Joined", render: (user) => formatDateTime(user.created_at) },
            {
              key: "actions",
              label: "Actions",
              render: (user) => {
                const isCurrentUser = currentUser && String(user.id) === String(currentUser.id);

                if (isCurrentUser) {
                  return <StatusPill tone="slate">Current user</StatusPill>;
                }

                return (
                  <ActionGroup>
                    <ActionButton onClick={() => updateUser(user, { role: user.role === "ADMIN" ? "USER" : "ADMIN" })}>
                      Make {user.role === "ADMIN" ? "User" : "Admin"}
                    </ActionButton>
                    <ActionButton onClick={() => updateUser(user, { is_active: !user.is_active })} tone={user.is_active ? "danger" : "primary"}>
                      {user.is_active ? "Deactivate" : "Activate"}
                    </ActionButton>
                  </ActionGroup>
                );
              },
            },
          ]}
          rows={users}
        />
      </Panel>
    </div>
  );
};

const PlansSection = () => {
  const [plans, setPlans] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", plan_type: "" });
  const [form, setForm] = useState(defaultPlanForm);
  const [editingId, setEditingId] = useState(null);
  const { feedback, showError, showSuccess } = useAdminFeedback();

  const loadPlans = () => {
    api.get("/api/v1/admin/plans/", { params: filters })
      .then(({ data }) => setPlans(toArray(data)))
      .catch((error) => {
        setPlans([]);
        showError(error, "Failed to load plans.");
      });
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const savePlan = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      display_order: Number(form.display_order || 0),
    };

    try {
      if (editingId) {
        await api.patch(`/api/v1/admin/plans/${editingId}/`, payload);
        showSuccess("Plan updated.");
      } else {
        await api.post("/api/v1/admin/plans/", payload);
        showSuccess("Plan created.");
      }
      setEditingId(null);
      setForm(defaultPlanForm);
      loadPlans();
    } catch (error) {
      showError(error, "Failed to save plan.");
    }
  };

  const runPlanAction = async (plan, action) => {
    try {
      await api.post(`/api/v1/admin/plans/${plan.id}/${action}/`);
      showSuccess(`Plan ${action}d.`);
      loadPlans();
    } catch (error) {
      showError(error, `Failed to ${action} plan.`);
    }
  };

  const startEdit = (plan) => {
    setEditingId(plan.id);
    setForm({
      ...defaultPlanForm,
      ...plan,
      price_usd: plan.price_usd || "",
      display_order: plan.display_order || 0,
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Panel as="form" className="p-4" onSubmit={savePlan}>
        <h2 className="text-base font-semibold text-slate-950">{editingId ? "Edit Plan" : "Create Plan"}</h2>
        <div className="mt-4 grid gap-3">
          <Field label="Name" onChange={(event) => updateForm("name", event.target.value)} required value={form.name} />
          <SelectField label="Type" onChange={(event) => updateForm("plan_type", event.target.value)} value={form.plan_type}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="one_time">One-time</option>
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price USD" onChange={(event) => updateForm("price_usd", event.target.value)} required type="number" value={form.price_usd} />
            <Field label="Currency" onChange={(event) => updateForm("currency", event.target.value)} value={form.currency} />
          </div>
          <Field label="Billing Interval" onChange={(event) => updateForm("billing_interval", event.target.value)} placeholder="month, year, one_time" value={form.billing_interval} />
          <Field label="Stripe Price ID" onChange={(event) => updateForm("stripe_price_id", event.target.value)} value={form.stripe_price_id} />
          <Field label="Stripe Product ID" onChange={(event) => updateForm("stripe_product_id", event.target.value)} value={form.stripe_product_id} />
          <Field label="Display Order" onChange={(event) => updateForm("display_order", event.target.value)} type="number" value={form.display_order} />
          <div className="flex flex-wrap gap-4">
            <CheckboxField checked={form.active} label="Active" onChange={(value) => updateForm("active", value)} />
            <CheckboxField checked={form.is_archived} label="Archived" onChange={(value) => updateForm("is_archived", value)} />
          </div>
          <div className="flex gap-2">
            <button className="rb-btn-primary flex-1" type="submit">{editingId ? "Save Plan" : "Create Plan"}</button>
            {editingId ? <button className="rb-btn-secondary" onClick={() => { setEditingId(null); setForm(defaultPlanForm); }} type="button">Cancel</button> : null}
          </div>
        </div>
      </Panel>
      <div className="space-y-4">
        <Feedback feedback={feedback} />
        <Panel className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_0.7fr_auto] lg:items-end">
            <Field label="Search" onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} value={filters.search} />
            <SelectField label="Status" onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </SelectField>
            <SelectField label="Type" onChange={(event) => setFilters((current) => ({ ...current, plan_type: event.target.value }))} value={filters.plan_type}>
              <option value="">All</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-time</option>
            </SelectField>
            <button className="rb-btn-dark h-10" onClick={loadPlans} type="button">Apply</button>
          </div>
        </Panel>
        <Panel className="p-4">
          <AdminTable
            columns={[
              { key: "name", label: "Plan", render: (plan) => <div><p className="font-semibold text-slate-950">{plan.name}</p><p className="mt-1 text-xs text-slate-500">{plan.plan_type}</p></div> },
              { key: "price", label: "Price", render: (plan) => money(plan.price_usd, plan.currency) },
              { key: "stripe", label: "Stripe", render: (plan) => <span className="break-all text-xs">{plan.stripe_price_id || "-"}</span> },
              { key: "state", label: "State", render: (plan) => <div className="flex flex-wrap gap-1.5"><StatusPill tone={plan.active ? "green" : "amber"}>{plan.active ? "Active" : "Inactive"}</StatusPill>{plan.is_archived ? <StatusPill tone="red">Archived</StatusPill> : null}</div> },
              {
                key: "actions",
                label: "Actions",
                render: (plan) => (
                  <ActionGroup>
                    <ActionButton onClick={() => startEdit(plan)}>Edit</ActionButton>
                    <ActionButton onClick={() => runPlanAction(plan, plan.active ? "deactivate" : "activate")} tone={plan.active ? "warning" : "primary"}>
                      {plan.active ? "Pause" : "Activate"}
                    </ActionButton>
                    <ActionButton onClick={() => runPlanAction(plan, "archive")} tone="danger">Archive</ActionButton>
                  </ActionGroup>
                ),
              },
            ]}
            rows={plans}
          />
        </Panel>
      </div>
    </div>
  );
};

const TrialSection = () => {
  const [form, setForm] = useState({ trial_enabled: true, default_trial_days: 14 });
  const { feedback, showError, showSuccess } = useAdminFeedback();

  useEffect(() => {
    api.get("/api/v1/admin/trial-settings/")
      .then(({ data }) => setForm(data))
      .catch((error) => showError(error, "Failed to load trial settings."));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.patch("/api/v1/admin/trial-settings/", {
        trial_enabled: form.trial_enabled,
        default_trial_days: Number(form.default_trial_days || 0),
      });
      setForm(data);
      showSuccess("Trial settings updated.");
    } catch (error) {
      showError(error, "Failed to update trial settings.");
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Feedback feedback={feedback} />
      <Panel as="form" className="p-4" onSubmit={save}>
        <div className="grid gap-4">
          <CheckboxField checked={form.trial_enabled} label="Enable trial for new users" onChange={(value) => setForm((current) => ({ ...current, trial_enabled: value }))} />
          <Field label="Default Trial Days" min="0" onChange={(event) => setForm((current) => ({ ...current, default_trial_days: event.target.value }))} type="number" value={form.default_trial_days} />
          <button className="rb-btn-primary w-fit" type="submit">Save Trial Settings</button>
        </div>
      </Panel>
    </div>
  );
};

const CryptoNetworksSection = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(defaultNetworkForm);
  const [editingId, setEditingId] = useState(null);
  const { feedback, showError, showSuccess } = useAdminFeedback();

  const load = () => api.get("/api/v1/admin/crypto/networks/").then(({ data }) => setItems(toArray(data))).catch((error) => showError(error, "Failed to load networks."));
  useEffect(() => { load(); }, []);
  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    const payload = { ...form, sort_order: Number(form.sort_order || 0) };
    try {
      if (editingId) await api.patch(`/api/v1/admin/crypto/networks/${editingId}/`, payload);
      else await api.post("/api/v1/admin/crypto/networks/", payload);
      setEditingId(null);
      setForm(defaultNetworkForm);
      showSuccess("Network saved.");
      load();
    } catch (error) {
      showError(error, "Failed to save network.");
    }
  };

  return (
    <CrudLayout
      feedback={feedback}
      form={(
        <Panel as="form" className="p-4" onSubmit={save}>
          <h2 className="text-base font-semibold text-slate-950">{editingId ? "Edit Network" : "Create Network"}</h2>
          <div className="mt-4 grid gap-3">
            <Field label="Code" onChange={(event) => updateForm("code", event.target.value)} required value={form.code} />
            <Field label="Display Name" onChange={(event) => updateForm("display_name", event.target.value)} required value={form.display_name} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Token" onChange={(event) => updateForm("token_symbol", event.target.value)} value={form.token_symbol} />
              <Field label="Network" onChange={(event) => updateForm("network_name", event.target.value)} value={form.network_name} />
            </div>
            <Field label="QR Payload Template" onChange={(event) => updateForm("qr_payload_template", event.target.value)} placeholder="{address}" value={form.qr_payload_template} />
            <Field label="Sort Order" onChange={(event) => updateForm("sort_order", event.target.value)} type="number" value={form.sort_order} />
            <CheckboxField checked={form.is_active} label="Active" onChange={(value) => updateForm("is_active", value)} />
            <button className="rb-btn-primary" type="submit">{editingId ? "Save Network" : "Create Network"}</button>
          </div>
        </Panel>
      )}
      table={(
        <AdminTable
          columns={[
            { key: "display_name", label: "Network", render: (row) => <div><p className="font-semibold text-slate-950">{row.display_name}</p><p className="mt-1 text-xs text-slate-500">{row.code}</p></div> },
            { key: "token", label: "Token", render: (row) => `${row.token_symbol || "-"} / ${row.network_name || "-"}` },
            { key: "active", label: "Active", render: (row) => <StatusPill tone={row.is_active ? "green" : "amber"}>{row.is_active ? "Active" : "Inactive"}</StatusPill> },
            { key: "actions", label: "Actions", render: (row) => <ActionGroup><ActionButton onClick={() => { setEditingId(row.id); setForm({ ...defaultNetworkForm, ...row }); }}>Edit</ActionButton></ActionGroup> },
          ]}
          rows={items}
        />
      )}
    />
  );
};

const CryptoWalletsSection = () => {
  const [wallets, setWallets] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [form, setForm] = useState(defaultWalletForm);
  const [editingId, setEditingId] = useState(null);
  const { feedback, showError, showSuccess } = useAdminFeedback();

  const load = () => Promise.all([api.get("/api/v1/admin/crypto/wallets/"), api.get("/api/v1/admin/crypto/networks/")])
    .then(([walletResponse, networkResponse]) => {
      setWallets(toArray(walletResponse.data));
      setNetworks(toArray(networkResponse.data));
    })
    .catch((error) => showError(error, "Failed to load wallets."));
  useEffect(() => { load(); }, []);
  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    const payload = { ...form, network: Number(form.network) };
    try {
      if (editingId) await api.patch(`/api/v1/admin/crypto/wallets/${editingId}/`, payload);
      else await api.post("/api/v1/admin/crypto/wallets/", payload);
      setEditingId(null);
      setForm(defaultWalletForm);
      showSuccess("Wallet saved.");
      load();
    } catch (error) {
      showError(error, "Failed to save wallet.");
    }
  };

  return (
    <CrudLayout
      feedback={feedback}
      form={(
        <Panel as="form" className="p-4" onSubmit={save}>
          <h2 className="text-base font-semibold text-slate-950">{editingId ? "Edit Wallet" : "Create Wallet"}</h2>
          <div className="mt-4 grid gap-3">
            <SelectField label="Network" onChange={(event) => updateForm("network", event.target.value)} required value={form.network}>
              <option value="">Choose network</option>
              {networks.map((network) => <option key={network.id} value={network.id}>{network.display_name}</option>)}
            </SelectField>
            <Field label="Label" onChange={(event) => updateForm("label", event.target.value)} value={form.label} />
            <Field label="Address" onChange={(event) => updateForm("address", event.target.value)} required value={form.address} />
            <Field label="QR Payload Override" onChange={(event) => updateForm("qr_payload_override", event.target.value)} placeholder="{address}" value={form.qr_payload_override} />
            <div className="flex flex-wrap gap-4">
              <CheckboxField checked={form.is_public} label="Public" onChange={(value) => updateForm("is_public", value)} />
              <CheckboxField checked={form.is_active} label="Active" onChange={(value) => updateForm("is_active", value)} />
            </div>
            <button className="rb-btn-primary" type="submit">{editingId ? "Save Wallet" : "Create Wallet"}</button>
          </div>
        </Panel>
      )}
      table={(
        <AdminTable
          columns={[
            { key: "label", label: "Wallet", render: (row) => <div><p className="font-semibold text-slate-950">{row.label || "Wallet"}</p><p className="mt-1 text-xs text-slate-500">{row.network_code}</p></div> },
            { key: "address", label: "Address", render: (row) => <span className="break-all text-xs">{row.address}</span> },
            { key: "state", label: "State", render: (row) => <div className="flex flex-wrap gap-1.5"><StatusPill tone={row.is_active ? "green" : "amber"}>{row.is_active ? "Active" : "Inactive"}</StatusPill><StatusPill tone={row.is_public ? "teal" : "slate"}>{row.is_public ? "Public" : "Private"}</StatusPill></div> },
            { key: "actions", label: "Actions", render: (row) => <ActionGroup><ActionButton onClick={() => { setEditingId(row.id); setForm({ ...defaultWalletForm, ...row, network: row.network || "" }); }}>Edit</ActionButton></ActionGroup> },
          ]}
          rows={wallets}
        />
      )}
    />
  );
};

const CryptoAvailabilitySection = () => {
  const [availability, setAvailability] = useState([]);
  const [plans, setPlans] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [form, setForm] = useState({ plan: "", network: "", is_enabled: true });
  const [editingId, setEditingId] = useState(null);
  const { feedback, showError, showSuccess } = useAdminFeedback();

  const load = () => Promise.all([
    api.get("/api/v1/admin/crypto/plan-availability/"),
    api.get("/api/v1/admin/plans/"),
    api.get("/api/v1/admin/crypto/networks/"),
  ])
    .then(([availabilityResponse, plansResponse, networksResponse]) => {
      setAvailability(toArray(availabilityResponse.data));
      setPlans(toArray(plansResponse.data));
      setNetworks(toArray(networksResponse.data));
    })
    .catch((error) => showError(error, "Failed to load crypto availability."));
  useEffect(() => { load(); }, []);

  const save = async (event) => {
    event.preventDefault();
    const payload = { plan: Number(form.plan), network: Number(form.network), is_enabled: form.is_enabled };
    try {
      if (editingId) await api.patch(`/api/v1/admin/crypto/plan-availability/${editingId}/`, payload);
      else await api.post("/api/v1/admin/crypto/plan-availability/", payload);
      setEditingId(null);
      setForm({ plan: "", network: "", is_enabled: true });
      showSuccess("Availability saved.");
      load();
    } catch (error) {
      showError(error, "Failed to save availability.");
    }
  };

  return (
    <CrudLayout
      feedback={feedback}
      form={(
        <Panel as="form" className="p-4" onSubmit={save}>
          <h2 className="text-base font-semibold text-slate-950">{editingId ? "Edit Availability" : "Add Availability"}</h2>
          <div className="mt-4 grid gap-3">
            <SelectField label="Plan" onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))} required value={form.plan}>
              <option value="">Choose plan</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </SelectField>
            <SelectField label="Network" onChange={(event) => setForm((current) => ({ ...current, network: event.target.value }))} required value={form.network}>
              <option value="">Choose network</option>
              {networks.map((network) => <option key={network.id} value={network.id}>{network.display_name}</option>)}
            </SelectField>
            <CheckboxField checked={form.is_enabled} label="Enabled" onChange={(value) => setForm((current) => ({ ...current, is_enabled: value }))} />
            <button className="rb-btn-primary" type="submit">{editingId ? "Save Availability" : "Add Availability"}</button>
          </div>
        </Panel>
      )}
      table={(
        <AdminTable
          columns={[
            { key: "plan_name", label: "Plan" },
            { key: "network_code", label: "Network" },
            { key: "enabled", label: "Enabled", render: (row) => <StatusPill tone={row.is_enabled ? "green" : "amber"}>{row.is_enabled ? "Enabled" : "Disabled"}</StatusPill> },
            { key: "actions", label: "Actions", render: (row) => <ActionGroup><ActionButton onClick={() => { setEditingId(row.id); setForm({ plan: row.plan, network: row.network, is_enabled: row.is_enabled }); }}>Edit</ActionButton></ActionGroup> },
          ]}
          rows={availability}
        />
      )}
    />
  );
};

const CryptoReviewsSection = () => {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [note, setNote] = useState("");
  const { feedback, showError, showSuccess } = useAdminFeedback();

  const load = () => {
    api.get("/api/v1/admin/crypto/payment-requests/", { params: { status: statusFilter } })
      .then(({ data }) => {
        const nextItems = toArray(data);
        setItems(nextItems);
        if (!selected && nextItems.length) setSelected(nextItems[0]);
      })
      .catch((error) => showError(error, "Failed to load crypto payment requests."));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  useEffect(() => {
    if (!selected?.id) {
      setLogs([]);
      return;
    }
    api.get(`/api/v1/admin/crypto/payment-requests/${selected.id}/review-logs/`)
      .then(({ data }) => setLogs(toArray(data)))
      .catch(() => setLogs([]));
  }, [selected?.id]);

  const review = async (action) => {
    if (!selected) return;
    try {
      const { data } = await api.post(`/api/v1/admin/crypto/payment-requests/${selected.id}/${action}/`, { note });
      const nextRequest = data.payment_request || selected;
      setSelected(nextRequest);
      setNote("");
      showSuccess(`Payment ${action}d.`);
      load();
    } catch (error) {
      showError(error, `Failed to ${action} payment.`);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <Feedback feedback={feedback} />
        <Panel className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <SelectField label="Status" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="">All</option>
              <option value="pending_review">Pending Review</option>
              <option value="pending_submission">Pending Submission</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </SelectField>
            <button className="rb-btn-dark h-10" onClick={load} type="button">Refresh</button>
          </div>
        </Panel>
        <Panel className="p-4">
          <AdminTable
            columns={[
              { key: "user_email", label: "User" },
              { key: "plan_name", label: "Plan" },
              { key: "amount", label: "Amount", render: (row) => `${row.expected_amount} ${row.token_symbol || row.expected_currency}` },
              { key: "network_code", label: "Network" },
              { key: "status", label: "Status", render: (row) => <StatusPill tone={row.status === "approved" ? "green" : row.status === "rejected" ? "red" : "amber"}>{row.status}</StatusPill> },
              { key: "actions", label: "Actions", render: (row) => <ActionGroup><ActionButton onClick={() => setSelected(row)} tone="primary">Review</ActionButton></ActionGroup> },
            ]}
            rows={items}
          />
        </Panel>
      </div>
      <Panel className="p-4">
        <h2 className="text-base font-semibold text-slate-950">Review Detail</h2>
        {selected ? (
          <div className="mt-4 space-y-4">
            <dl className="grid gap-3 text-sm">
              {[
                ["Reference", selected.reference_code],
                ["User", selected.user_email],
                ["Plan", selected.plan_name],
                ["Amount", `${selected.expected_amount} ${selected.token_symbol || selected.expected_currency}`],
                ["Network", selected.network_code],
                ["Wallet", selected.wallet_address],
                ["Transaction", selected.transaction_hash || "-"],
                ["Sender", selected.sender_address || "-"],
              ].map(([label, value]) => (
                <div className="grid gap-1" key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
                  <dd className="break-all font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
            <textarea className="rb-field min-h-24 text-sm" onChange={(event) => setNote(event.target.value)} placeholder="Review note..." value={note} />
            <div className="flex gap-2">
              <button className="rb-btn-primary flex-1" disabled={selected.status !== "pending_review"} onClick={() => review("approve")} type="button">Approve</button>
              <button className="rb-btn-secondary flex-1" disabled={selected.status !== "pending_review"} onClick={() => review("reject")} type="button">Reject</button>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-950">Review Logs</h3>
              <div className="mt-3 space-y-2">
                {logs.length ? logs.map((log) => (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs" key={log.id}>
                    <p className="font-semibold text-slate-900">{log.action} by {log.actor_email}</p>
                    <p className="mt-1 text-slate-500">{formatDateTime(log.created_at)} {log.note ? `- ${log.note}` : ""}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No review logs yet.</p>}
              </div>
            </div>
          </div>
        ) : <p className="mt-4 text-sm text-slate-500">Select a payment request to review.</p>}
      </Panel>
    </div>
  );
};

const LogsSection = () => {
  const [logs, setLogs] = useState([]);
  const { feedback, showError } = useAdminFeedback();

  useEffect(() => {
    api.get("/api/v1/admin/action-logs/")
      .then(({ data }) => setLogs(toArray(data)))
      .catch((error) => showError(error, "Failed to load action logs."));
  }, []);

  return (
    <div className="space-y-4">
      <Feedback feedback={feedback} />
      <Panel className="p-4">
        <AdminTable
          columns={[
            { key: "action_type", label: "Action", width: "14rem", cellClassName: "font-medium text-slate-800" },
            { key: "actor_email", label: "Actor", width: "15rem", cellClassName: "whitespace-nowrap" },
            { key: "target", label: "Target", width: "13rem", render: (row) => `${row.target_type || "-"} #${row.target_id || "-"}` },
            { key: "created_at", label: "Time", width: "11rem", cellClassName: "whitespace-nowrap", render: (row) => formatDateTime(row.created_at) },
            {
              key: "payload",
              label: "Payload",
              width: "24rem",
              render: (row) => (
                <code className="block line-clamp-2 break-all rounded-md bg-slate-50 px-2 py-1 text-[11px] leading-5 text-slate-600">
                  {formatPayloadSnippet(row.after_payload)}
                </code>
              ),
            },
          ]}
          rows={logs}
        />
      </Panel>
    </div>
  );
};

const CrudLayout = ({ feedback, form, table }) => (
  <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
    {form}
    <div className="space-y-4">
      <Feedback feedback={feedback} />
      <Panel className="p-4">{table}</Panel>
    </div>
  </div>
);

export default AdminPage;

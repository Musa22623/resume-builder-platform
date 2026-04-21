import { useEffect, useState } from "react";
import api from "../services/api/client";
import { getUserDisplayName, getUserSecondaryText } from "../lib/userDisplay";

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [replyById, setReplyById] = useState({});

  useEffect(() => {
    api.get("/api/admin/users/").then((res) => setUsers(res.data)).catch(() => setUsers([]));
    api.get("/api/admin/contact-messages/").then((res) => setMessages(res.data)).catch(() => setMessages([]));
  }, []);

  const reply = async (id) => {
    const admin_reply = replyById[id]?.trim();
    if (!admin_reply) return;

    await api.patch(`/api/admin/contact-messages/${id}/`, { admin_reply, is_resolved: true });
    const { data } = await api.get("/api/admin/contact-messages/");
    setMessages(data);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Admin panel</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Users, support traffic, and quick actions.</h1>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold text-slate-900">Users</h2>
          <div className="mt-5 space-y-3">
            {users.map((u) => (
              <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600" key={u.id}>
                <p className="font-semibold text-slate-900">{getUserDisplayName(u)}</p>
                <p className="mt-1">{getUserSecondaryText(u) || `User #${u.id}`}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold text-slate-900">Support messages</h2>
          <div className="mt-5 space-y-4">
            {messages.map((m) => (
              <div className="rounded-[1.5rem] border border-slate-200 p-5" key={m.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{getUserDisplayName(m)}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      m.admin_reply ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {m.admin_reply ? "Resolved" : "Pending"}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{m.message}</p>
                <p className="mt-4 text-sm text-slate-500">Reply: {m.admin_reply || "Pending"}</p>
                <input
                  className="rb-field mt-4"
                  placeholder="Write reply..."
                  onChange={(e) => setReplyById((prev) => ({ ...prev, [m.id]: e.target.value }))}
                />
                <button className="rb-btn-primary mt-3" onClick={() => reply(m.id)} type="button">
                  Send Reply & Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminPage;

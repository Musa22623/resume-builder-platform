import { useEffect, useMemo, useState } from "react";
import api from "../services/api/client";

const AdminChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [status, setStatus] = useState("");

  const loadMessages = async () => {
    try {
      const { data } = await api.get("/api/admin/contact-messages/");
      setMessages(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch {
      setStatus("Failed to load chat messages.");
    }
  };

  useEffect(() => {
    loadMessages();
    const id = setInterval(loadMessages, 10000);
    return () => clearInterval(id);
  }, []);

  const selected = useMemo(() => messages.find((m) => m.id === selectedId), [messages, selectedId]);

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;

    try {
      await api.patch(`/api/admin/contact-messages/${selected.id}/`, {
        admin_reply: replyText.trim(),
        is_resolved: true,
      });
      setReplyText("");
      setStatus("Reply sent.");
      await loadMessages();
    } catch {
      setStatus("Failed to send reply.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Admin chat</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Reply to support conversations from one inbox.</h1>
        <p className="mt-4 text-sm text-slate-500">{status}</p>
      </section>
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-900">Users</h3>
          {messages.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`mt-3 block w-full rounded-2xl px-4 py-4 text-left transition ${
                selectedId === m.id
                  ? "border-2 border-teal-500 bg-teal-50"
                  : "border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
              type="button"
            >
              <div className="font-semibold text-slate-900">{m.username}</div>
              <div className="mt-1 text-sm text-slate-500">{m.is_resolved ? "Resolved" : "Open"}</div>
            </button>
          ))}
          {!messages.length ? <p className="mt-4 text-sm text-slate-500">No messages yet.</p> : null}
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a chat from the left.</p>
          ) : (
            <>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Conversation with {selected.username}</h3>
              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm leading-7 text-slate-700"><strong className="text-slate-900">User:</strong> {selected.message}</p>
                <p className="mt-3 text-sm leading-7 text-slate-700"><strong className="text-teal-700">Admin:</strong> {selected.admin_reply || "No reply yet"}</p>
              </div>
              <textarea
                className="rb-field mt-5 min-h-40"
                rows={5}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply to the user..."
              />
              <button className="rb-btn-primary mt-4" onClick={sendReply} type="button">
                Send Reply and Resolve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChatPage;

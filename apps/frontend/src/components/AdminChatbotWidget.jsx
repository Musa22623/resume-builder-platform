import { useEffect, useState } from "react";
import api from "../services/api/client";

const boxStyle = {
  position: "fixed",
  right: 20,
  bottom: 20,
  width: 360,
  zIndex: 999,
};

const AdminChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/api/admin/contact-messages/");
      setHistory(data);
    } catch {
      setStatus("Failed to load messages.");
    }
  };

  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  const send = async () => {
    if (!message.trim()) return;
    try {
      await api.post("/api/admin/contact-messages/", { message: message.trim() });
      setMessage("");
      setStatus("Message sent to admin.");
      await loadHistory();
    } catch {
      setStatus("Failed to send message.");
    }
  };

  if (!open) {
    return (
      <button
        className="rb-btn-primary fixed right-5 bottom-5 z-[999] rounded-full px-5 py-3"
        onClick={() => setOpen(true)}
        type="button"
      >
        Chat with Admin
      </button>
    );
  }

  return (
    <div
      className="rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur"
      style={boxStyle}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Support</p>
          <strong className="mt-1 block text-lg text-slate-900">Message an admin</strong>
        </div>
        <button
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          onClick={() => setOpen(false)}
          type="button"
        >
          Close
        </button>
      </div>
      <div className="mt-4 max-h-56 space-y-3 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-3">
        {history.map((item) => (
          <div className="rounded-2xl bg-white p-3 shadow-sm" key={item.id}>
            <div className="text-sm text-slate-700"><strong className="text-slate-900">You:</strong> {item.message}</div>
            {item.admin_reply ? (
              <div className="mt-2 text-sm text-slate-700">
                <strong className="text-teal-700">Admin:</strong> {item.admin_reply}
              </div>
            ) : null}
          </div>
        ))}
        {!history.length ? <p className="text-sm text-slate-500">No messages yet. Ask for help any time.</p> : null}
      </div>
      <textarea
        className="mt-4 min-h-24 w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        rows={3}
        value={message}
      />
      <button
        className="rb-btn-primary mt-3 w-full"
        onClick={send}
        type="button"
      >
        Send
      </button>
      <p className="mt-3 text-sm text-slate-500">{status}</p>
    </div>
  );
};

export default AdminChatbotWidget;

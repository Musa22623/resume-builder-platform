import { useEffect, useState } from "react";
import api from "../services/api/client";

const boxStyle = {
  position: "fixed",
  right: 16,
  bottom: 16,
  width: 340,
  maxWidth: "calc(100vw - 24px)",
  zIndex: 999,
};

const ChatIcon = () => (
  <svg aria-hidden="true" className="h-4.5 w-4.5" fill="none" viewBox="0 0 20 20">
    <path d="M5.5 14.5 3 17V5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v6A2.5 2.5 0 0 1 14.5 14h-9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M7 7.5h6M7 10.5h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
  </svg>
);

const CloseIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
    <path d="m6 6 8 8M14 6l-8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
  </svg>
);

const SendIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 20 20">
    <path d="M4 10h10.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    <path d="m10 4.5 5.5 5.5-5.5 5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
  </svg>
);

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

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  if (!open) {
    return (
      <button
        className="fixed right-4 bottom-4 z-[999] inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_16px_40px_rgba(15,23,42,0.16)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white">
          <ChatIcon />
        </span>
        <span>Chat with Admin</span>
      </button>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/95 shadow-[0_22px_60px_rgba(15,23,42,0.2)] backdrop-blur"
      style={boxStyle}
    >
      <div className="border-b border-slate-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,250,0.95))] px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
              <ChatIcon />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700">Support</p>
              <p className="text-sm font-semibold text-slate-900">Admin chat</p>
            </div>
          </div>

          <button
            aria-label="Close admin chat"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
            onClick={() => setOpen(false)}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-3.5">
        <div className="max-h-[300px] space-y-3 overflow-y-auto rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-3">
          {history.map((item) => (
            <div className="space-y-2" key={item.id}>
              <div className="ml-auto max-w-[88%] rounded-[1.1rem] rounded-br-md bg-slate-900 px-3 py-2.5 text-sm leading-6 text-white shadow-sm">
                {item.message}
              </div>
              {item.admin_reply ? (
                <div className="max-w-[88%] rounded-[1.1rem] rounded-bl-md border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 shadow-sm">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Admin</p>
                  {item.admin_reply}
                </div>
              ) : (
                <div className="max-w-[88%] rounded-[1.1rem] rounded-bl-md border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-xs font-medium text-slate-400">
                  Waiting for admin reply
                </div>
              )}
            </div>
          ))}

          {!history.length ? (
            <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-white/80 px-3 py-4 text-center">
              <p className="text-sm font-semibold text-slate-700">Start a conversation</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Ask about billing, account issues, or resume help.</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
          <textarea
            className="min-h-[84px] w-full resize-none border-0 bg-transparent px-0 py-0 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Type a message to the admin..."
            rows={3}
            value={message}
          />

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-[11px] text-slate-400">Enter to send, Shift+Enter for newline</p>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!message.trim()}
              onClick={send}
              type="button"
            >
              <span>Send</span>
              <SendIcon />
            </button>
          </div>
        </div>

        {status ? <p className="px-1 text-xs font-medium text-slate-500">{status}</p> : null}
      </div>
    </div>
  );
};

export default AdminChatbotWidget;

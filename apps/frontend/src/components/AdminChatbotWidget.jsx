import { useEffect, useState } from "react";
import api from "../services/api/client";

const boxStyle = {
  position: "fixed",
  right: 16,
  bottom: 16,
  width: 320,
  background: "white",
  border: "1px solid #ddd",
  padding: 12,
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
      <button style={{ position: "fixed", right: 16, bottom: 16, zIndex: 999 }} onClick={() => setOpen(true)}>
        Chat with Admin
      </button>
    );
  }

  return (
    <div style={boxStyle}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Support Chat</strong>
        <button onClick={() => setOpen(false)}>X</button>
      </div>
      <div style={{ maxHeight: 180, overflowY: "auto", margin: "8px 0", border: "1px solid #eee", padding: 6 }}>
        {history.map((item) => (
          <div key={item.id} style={{ marginBottom: 8 }}>
            <div><strong>You:</strong> {item.message}</div>
            {item.admin_reply ? <div><strong>Admin:</strong> {item.admin_reply}</div> : null}
          </div>
        ))}
      </div>
      <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." />
      <button onClick={send}>Send</button>
      <p>{status}</p>
    </div>
  );
};

export default AdminChatbotWidget;

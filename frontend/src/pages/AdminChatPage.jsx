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
    <div>
      <h2>Admin Chat</h2>
      <p>{status}</p>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #ddd", padding: 10 }}>
          <h3>Users</h3>
          {messages.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                marginBottom: 8,
                padding: 8,
                border: selectedId === m.id ? "2px solid #2563eb" : "1px solid #ccc",
                background: "#fff",
              }}
            >
              <div><strong>{m.username}</strong></div>
              <div>{m.is_resolved ? "Resolved" : "Open"}</div>
            </button>
          ))}
          {!messages.length ? <p>No messages yet.</p> : null}
        </div>

        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          {!selected ? (
            <p>Select a chat from the left.</p>
          ) : (
            <>
              <h3>Conversation with {selected.username}</h3>
              <div style={{ marginBottom: 10, padding: 10, border: "1px solid #eee" }}>
                <p><strong>User:</strong> {selected.message}</p>
                <p><strong>Admin:</strong> {selected.admin_reply || "No reply yet"}</p>
              </div>
              <textarea
                rows={5}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply to the user..."
                style={{ width: "100%" }}
              />
              <button onClick={sendReply}>Send Reply and Resolve</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChatPage;

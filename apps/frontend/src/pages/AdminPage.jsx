import { useEffect, useState } from "react";
import api from "../services/api/client";

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [replyById, setReplyById] = useState({});

  useEffect(() => {
    api.get("/api/admin/users/").then((res) => setUsers(res.data));
    api.get("/api/admin/contact-messages/").then((res) => setMessages(res.data));
  }, []);

  const reply = async (id) => {
    const admin_reply = replyById[id]?.trim();
    if (!admin_reply) return;
    await api.patch(`/api/admin/contact-messages/${id}/`, { admin_reply, is_resolved: true });
    const { data } = await api.get("/api/admin/contact-messages/");
    setMessages(data);
  };

  return (
    <div>
      <h2>Admin Panel</h2>
      <ul>
        {users.map((u) => (
          <li key={u.id}>{u.username} - {u.email}</li>
        ))}
      </ul>
      <h3>Support Messages</h3>
      {messages.map((m) => (
        <div key={m.id} style={{ border: "1px solid #ccc", marginBottom: 10, padding: 10 }}>
          <p><strong>{m.username}</strong>: {m.message}</p>
          <p>Reply: {m.admin_reply || "Pending"}</p>
          <input
            placeholder="Write reply..."
            onChange={(e) => setReplyById((prev) => ({ ...prev, [m.id]: e.target.value }))}
          />
          <button onClick={() => reply(m.id)}>Send Reply & Resolve</button>
        </div>
      ))}
    </div>
  );
};

export default AdminPage;

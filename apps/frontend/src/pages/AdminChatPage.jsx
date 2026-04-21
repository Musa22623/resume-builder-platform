import { useEffect, useMemo, useState } from "react";
import api from "../services/api/client";
import { getUserDisplayName, getUserSecondaryText } from "../lib/userDisplay";

const formatTimestamp = (value) => {
  if (!value) return "Time unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const getStatusBadgeClassName = (isResolved) =>
  isResolved
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";

const feedbackToneClassNames = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
};

const getMessageMeta = (message) => getUserSecondaryText(message) || `Ticket #${message.id}`;

const filterOptions = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
];

const AdminChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMessages = async () => {
    try {
      const { data } = await api.get("/api/admin/contact-messages/");
      setMessages(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch {
      setFeedback({ tone: "error", message: "Failed to load chat messages." });
    }
  };

  useEffect(() => {
    loadMessages();
    const id = setInterval(loadMessages, 10000);
    return () => clearInterval(id);
  }, []);

  const openCount = useMemo(() => messages.filter((message) => !message.is_resolved).length, [messages]);
  const resolvedCount = useMemo(() => messages.filter((message) => message.is_resolved).length, [messages]);
  const filteredMessages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return messages.filter((message) => {
      if (activeFilter === "open" && message.is_resolved) return false;
      if (activeFilter === "resolved" && !message.is_resolved) return false;

      if (!normalizedQuery) return true;

      const haystack = [
        getUserDisplayName(message),
        message.email,
        message.message,
        message.admin_reply,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [activeFilter, messages, searchQuery]);
  const selected = useMemo(() => filteredMessages.find((m) => m.id === selectedId) || null, [filteredMessages, selectedId]);

  useEffect(() => {
    if (!filteredMessages.length) {
      setSelectedId(null);
      return;
    }

    const hasSelectedItem = filteredMessages.some((message) => message.id === selectedId);
    if (!hasSelectedItem) {
      setSelectedId(filteredMessages[0].id);
    }
  }, [filteredMessages, selectedId]);

  useEffect(() => {
    setReplyText("");
  }, [selectedId]);

  const sendReply = async ({ resolve = false } = {}) => {
    if (!selected || !replyText.trim()) return;

    try {
      setIsSubmitting(true);
      await api.patch(`/api/admin/contact-messages/${selected.id}/`, {
        admin_reply: replyText.trim(),
        is_resolved: resolve,
      });
      setReplyText("");
      setFeedback({
        tone: "success",
        message: resolve ? "Reply sent and marked resolved." : "Reply sent.",
      });
      await loadMessages();
    } catch {
      setFeedback({ tone: "error", message: "Failed to send reply." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateResolution = async (isResolved) => {
    if (!selected) return;

    try {
      setIsSubmitting(true);
      await api.patch(`/api/admin/contact-messages/${selected.id}/`, {
        is_resolved: isResolved,
      });
      setFeedback({
        tone: "success",
        message: isResolved ? "Conversation marked resolved." : "Conversation reopened.",
      });
      await loadMessages();
    } catch {
      setFeedback({ tone: "error", message: "Failed to update conversation status." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-white/80 bg-white/88 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:px-5 sm:py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">Admin chat</p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-[1.55rem]">Support Inbox</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
              Review incoming support requests, send a reply, and close the item once the issue is handled.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[300px]">
            <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Total</p>
              <p className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">{messages.length}</p>
            </div>
            <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">Open</p>
              <p className="mt-1.5 text-lg font-semibold tracking-tight text-amber-900">{openCount}</p>
            </div>
            <div className="rounded-[1.15rem] border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Resolved</p>
              <p className="mt-1.5 text-lg font-semibold tracking-tight text-emerald-900">{resolvedCount}</p>
            </div>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mt-3 rounded-[1.15rem] border px-3 py-2.5 text-sm font-medium ${
              feedbackToneClassNames[feedback.tone] || feedbackToneClassNames.success
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-[1.75rem] border border-white/80 bg-white/92 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-1 pb-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Inbox</h2>
              <p className="mt-1 text-sm text-slate-500">Latest support requests</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{filteredMessages.length} shown</div>
          </div>

          <div className="mt-3 space-y-3">
            <input
              className="rb-field h-11 rounded-[1.15rem] px-3 py-2.5 text-sm"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by user or message..."
              type="text"
              value={searchQuery}
            />

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => {
                const isActive = activeFilter === option.id;

                return (
                  <button
                    key={option.id}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    onClick={() => setActiveFilter(option.id)}
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {filteredMessages.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`block w-full rounded-[1.35rem] border px-3 py-3 text-left transition ${
                  selectedId === m.id
                    ? "border-teal-500 bg-teal-50 shadow-[0_12px_28px_rgba(20,184,166,0.12)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{getUserDisplayName(m)}</p>
                    <p className="mt-1 truncate text-xs font-medium text-slate-400">{getMessageMeta(m)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{formatTimestamp(m.updated_at || m.created_at)}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClassName(
                      m.is_resolved,
                    )}`}
                  >
                    {m.is_resolved ? "Resolved" : "Open"}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{m.message}</p>
              </button>
            ))}
          </div>

          {!messages.length ? (
            <div className="mt-3 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No messages yet</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Incoming user questions will appear here.</p>
            </div>
          ) : !filteredMessages.length ? (
            <div className="mt-3 rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No matches found</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Try a different keyword or switch the status filter.</p>
            </div>
          ) : null}
        </aside>

        <section className="rounded-[1.75rem] border border-white/80 bg-white/92 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
          {!selected ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
              <p className="text-base font-semibold text-slate-800">Select a message</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose an item from the inbox to review the request and send a reply.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Conversation</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {getUserDisplayName(selected)}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-slate-500">{getMessageMeta(selected)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">Created {formatTimestamp(selected.created_at)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Updated {formatTimestamp(selected.updated_at)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusBadgeClassName(
                      selected.is_resolved,
                    )}`}
                  >
                    {selected.is_resolved ? "Resolved" : "Open"}
                  </span>
                  <button
                    className="rb-btn-secondary px-3 py-2 text-xs"
                    disabled={isSubmitting}
                    onClick={() => updateResolution(!selected.is_resolved)}
                    type="button"
                  >
                    {selected.is_resolved ? "Reopen" : "Mark Resolved"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <article className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">User message</p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{selected.message}</p>
                  </article>

                  <article className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Admin reply</p>
                      <span className="text-xs font-medium text-slate-400">
                        {selected.admin_reply ? "Existing response" : "No response yet"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {selected.admin_reply || "No reply has been sent yet. Use the reply box to respond to this user."}
                    </p>
                  </article>
                </div>

                <aside className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Reply to user</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Send a direct answer and close the ticket when the issue is handled.
                  </p>

                  <textarea
                    className="rb-field mt-4 min-h-48 bg-white"
                    rows={8}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a concise admin reply..."
                  />

                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      className="rb-btn-secondary w-full justify-center"
                      disabled={!replyText.trim() || isSubmitting}
                      onClick={() => sendReply({ resolve: false })}
                      type="button"
                    >
                      {isSubmitting ? "Sending..." : "Send Reply"}
                    </button>
                    <button
                      className="rb-btn-primary w-full justify-center"
                      disabled={!replyText.trim() || isSubmitting}
                      onClick={() => sendReply({ resolve: true })}
                      type="button"
                    >
                      {isSubmitting ? "Sending..." : "Send Reply and Resolve"}
                    </button>
                    <p className="text-xs leading-5 text-slate-400">
                      Use a plain reply to keep the conversation open, or resolve it as part of the same action.
                    </p>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminChatPage;

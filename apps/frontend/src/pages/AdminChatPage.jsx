import { useEffect, useMemo, useState } from "react";
import api from "../services/api/client";
import { getUserDisplayName, getUserSecondaryText } from "../lib/userDisplay";

const RECENT_SEARCHES_KEY = "supportInboxRecentSearches";

const formatTimestamp = (value) => {
  if (!value) return "Time unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatRelativeTime = (value) => {
  if (!value) return "unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return "just now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatTimestamp(value);
};

const getStatusBadgeClassName = (isResolved) =>
  isResolved
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";

const feedbackToneClassNames = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
};

const priorityClassNames = {
  urgent: "border-rose-200 bg-rose-50 text-rose-700",
  payment: "border-violet-200 bg-violet-50 text-violet-700",
  general: "border-slate-200 bg-slate-50 text-slate-600",
};

const getMessageMeta = (message) => getUserSecondaryText(message) || `Ticket #${message.id}`;

const getUserEmail = (message) =>
  message?.email || message?.user_email || message?.user?.email || getUserSecondaryText(message) || "";

const getLastActivityAt = (message) => message?.updated_at || message?.created_at;

const getHasUnreadSignal = (message) => !message.is_resolved && !message.admin_reply;

const getPriority = (message) => {
  const haystack = [message?.message, message?.admin_reply, message?.email, message?.username]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(urgent|asap|immediately|blocked|can't login|cannot login|error|failed|expired token)\b/.test(haystack)) {
    return { id: "urgent", label: "Urgent" };
  }

  if (/\b(payment|billing|stripe|crypto|invoice|refund|charge|subscription|usdt)\b/.test(haystack)) {
    return { id: "payment", label: "Payment issue" };
  }

  return { id: "general", label: "General question" };
};

const getFilterCount = (messages, filterId) => {
  if (filterId === "open") return messages.filter((message) => !message.is_resolved).length;
  if (filterId === "resolved") return messages.filter((message) => message.is_resolved).length;
  return messages.length;
};

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
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeFilter, setActiveFilter] = useState("open");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadMessages = async ({ silent = false } = {}) => {
    try {
      if (!silent) setIsLoading(true);
      const { data } = await api.get("/api/admin/contact-messages/");
      const nextMessages = Array.isArray(data) ? data : [];

      setMessages(nextMessages);
      setLoadError("");
      if (!selectedId && nextMessages.length) setSelectedId(nextMessages[0].id);
    } catch {
      setLoadError("Failed to load messages");
      if (!silent) setFeedback({ tone: "error", message: "Failed to load messages." });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const id = setInterval(() => loadMessages({ silent: true }), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const savedSearches = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
      if (Array.isArray(savedSearches)) setRecentSearches(savedSearches.slice(0, 5));
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const openCount = useMemo(() => messages.filter((message) => !message.is_resolved).length, [messages]);
  const resolvedCount = useMemo(() => messages.filter((message) => message.is_resolved).length, [messages]);
  const unreadCount = useMemo(() => messages.filter(getHasUnreadSignal).length, [messages]);

  const filteredMessages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return messages.filter((message) => {
      if (activeFilter === "open" && message.is_resolved) return false;
      if (activeFilter === "resolved" && !message.is_resolved) return false;

      if (!normalizedQuery) return true;

      const haystack = [
        getUserDisplayName(message),
        getUserEmail(message),
        message.username,
        message.message,
        message.admin_reply,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [activeFilter, messages, searchQuery]);

  const selected = useMemo(
    () => filteredMessages.find((message) => message.id === selectedId) || null,
    [filteredMessages, selectedId],
  );

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

  const commitRecentSearch = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    setRecentSearches((current) => {
      const next = [trimmedValue, ...current.filter((item) => item.toLowerCase() !== trimmedValue.toLowerCase())].slice(0, 5);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  };

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
        message: resolve ? "Reply sent and ticket resolved." : "Reply sent.",
      });
      await loadMessages({ silent: true });
    } catch {
      setFeedback({ tone: "error", message: "Failed to send reply." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateMessageResolution = async (message, isResolved) => {
    if (!message) return;

    try {
      setIsSubmitting(true);
      await api.patch(`/api/admin/contact-messages/${message.id}/`, {
        is_resolved: isResolved,
      });
      setFeedback({
        tone: "success",
        message: isResolved ? "Marked as resolved." : "Ticket reopened.",
      });
      await loadMessages({ silent: true });
    } catch {
      setFeedback({ tone: "error", message: "Failed to update ticket status." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryLoadMessages = () => {
    setFeedback(null);
    loadMessages();
  };

  const emptyTitle = activeFilter === "open" ? "No open tickets 🎉" : "You're all caught up";
  const emptyDescription =
    activeFilter === "resolved"
      ? "Resolved tickets will appear here after your team closes them."
      : "New customer messages will appear here as soon as they arrive.";

  const selectedPriority = selected ? getPriority(selected) : null;
  const selectedEmail = selected ? getUserEmail(selected) : "";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/80 bg-white/92 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">Support operations</p>
              {unreadCount ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]" />
                  {unreadCount} unread
                </span>
              ) : null}
            </div>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-[1.55rem]">Support Inbox</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
              Triage, reply, and resolve customer messages from one focused workspace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            {[
              { id: "all", label: "Total", value: messages.length, className: "border-slate-200 bg-slate-50 text-slate-900" },
              { id: "open", label: "Open", value: openCount, className: "border-amber-200 bg-amber-50 text-amber-900" },
              { id: "resolved", label: "Resolved", value: resolvedCount, className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
            ].map((stat) => {
              const isActive = activeFilter === stat.id;

              return (
                <button
                  className={`rounded-xl border px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    stat.className
                  } ${isActive ? "ring-2 ring-teal-300" : ""}`}
                  key={stat.id}
                  onClick={() => setActiveFilter(stat.id)}
                  type="button"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">{stat.label}</span>
                  <span className="mt-1.5 block text-2xl font-semibold tracking-tight">{stat.value}</span>
                </button>
              );
            })}
          </div>
        </div>

        {feedback ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2.5 text-sm font-medium ${
              feedbackToneClassNames[feedback.tone] || feedbackToneClassNames.success
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
        <aside className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-1 pb-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Queue</h2>
              <p className="mt-1 text-sm text-slate-500">Open newest tickets first</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{filteredMessages.length} shown</div>
          </div>

          <div className="mt-3 space-y-3">
            <input
              className="rb-field h-11 px-3 py-2.5 text-sm"
              onBlur={(event) => commitRecentSearch(event.target.value)}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRecentSearch(event.currentTarget.value);
              }}
              placeholder="Search email or keyword..."
              type="text"
              value={searchQuery}
            />

            {recentSearches.length ? (
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                    key={item}
                    onClick={() => setSearchQuery(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => {
                const isActive = activeFilter === option.id;
                const count = getFilterCount(messages, option.id);

                return (
                  <button
                    key={option.id}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "border-teal-500 bg-teal-50 text-teal-700 shadow-[0_8px_18px_rgba(20,184,166,0.12)]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    onClick={() => setActiveFilter(option.id)}
                    type="button"
                  >
                    {option.label} {count}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {loadError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-sm font-semibold text-rose-800">Failed to load messages</p>
                <p className="mt-1 text-xs leading-5 text-rose-700">Refresh the inbox and try again.</p>
                <button className="rb-btn-secondary mt-3 h-9 px-3 py-1.5 text-xs" onClick={retryLoadMessages} type="button">
                  Retry
                </button>
              </div>
            ) : null}

            {isLoading && !messages.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                Loading support messages...
              </div>
            ) : null}

            {!loadError &&
              filteredMessages.map((message) => {
                const isSelected = selectedId === message.id;
                const priority = getPriority(message);
                const email = getUserEmail(message);
                const hasUnread = getHasUnreadSignal(message);

                return (
                  <article
                    key={message.id}
                    className={`rounded-xl border px-3 py-3 transition ${
                      isSelected
                        ? "border-teal-500 bg-teal-50 shadow-[0_14px_30px_rgba(20,184,166,0.16)]"
                        : hasUnread
                          ? "border-amber-200 bg-amber-50/55 hover:border-amber-300"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <button className="block w-full text-left" onClick={() => setSelectedId(message.id)} type="button">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {hasUnread ? <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" /> : null}
                            <p className="truncate text-sm font-semibold text-slate-900">{getUserDisplayName(message)}</p>
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                            {email || getMessageMeta(message)}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-400">
                            Received {formatRelativeTime(message.created_at)} · Last {formatRelativeTime(getLastActivityAt(message))}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            getStatusBadgeClassName(message.is_resolved)
                          }`}
                        >
                          {message.is_resolved ? "Resolved" : "Open"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            priorityClassNames[priority.id]
                          }`}
                        >
                          {priority.label}
                        </span>
                        {hasUnread ? (
                          <span className="inline-flex rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                            New
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{message.message}</p>
                    </button>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      <button
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700 disabled:pointer-events-none disabled:opacity-50"
                        disabled={isSubmitting}
                        onClick={() => updateMessageResolution(message, !message.is_resolved)}
                        type="button"
                      >
                        {message.is_resolved ? "Reopen" : "Mark as resolved"}
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>

          {!loadError && !isLoading && !messages.length ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">You're all caught up</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Incoming user questions will appear here.</p>
            </div>
          ) : !loadError && !isLoading && messages.length && !filteredMessages.length ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">{emptyTitle}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{emptyDescription}</p>
            </div>
          ) : null}
        </aside>

        <section className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
          {!selected ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-12 text-center">
              <p className="text-base font-semibold text-slate-800">{emptyTitle}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Select a ticket to read the message, reply, and close the loop.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Conversation</p>
                    {getHasUnreadSignal(selected) ? (
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Unread</span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {getUserDisplayName(selected)}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-slate-600">{selectedEmail || getMessageMeta(selected)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">Received: {formatRelativeTime(selected.created_at)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      Last reply: {selected.admin_reply ? formatRelativeTime(selected.updated_at) : "No reply yet"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">{formatTimestamp(selected.created_at)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      priorityClassNames[selectedPriority.id]
                    }`}
                  >
                    {selectedPriority.label}
                  </span>
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
                    onClick={() => updateMessageResolution(selected, !selected.is_resolved)}
                    type="button"
                  >
                    {selected.is_resolved ? "Reopen" : "Mark as Resolved"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-4">
                  <article className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Message</p>
                      <span className="text-xs font-semibold text-slate-400">{formatRelativeTime(selected.created_at)}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{selected.message}</p>
                  </article>

                  <article className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Previous reply</p>
                      <span className="text-xs font-medium text-slate-400">
                        {selected.admin_reply ? "Sent" : "No response yet"}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                      {selected.admin_reply || "Reply here to keep the user moving. Resolve the ticket when the issue is handled."}
                    </p>
                  </article>
                </div>

                <aside className="rounded-xl border border-teal-100 bg-teal-50/55 px-4 py-4 shadow-[0_12px_28px_rgba(20,184,166,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700">Reply panel</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Answer clearly, then mark the ticket resolved when no follow-up is needed.
                  </p>

                  <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor="support-reply">
                    Reply input
                  </label>
                  <textarea
                    className="rb-field mt-2 min-h-52 bg-white"
                    id="support-reply"
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Write a concise admin reply..."
                    rows={9}
                    value={replyText}
                  />

                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      className="rb-btn-primary h-11 w-full justify-center"
                      disabled={!replyText.trim() || isSubmitting}
                      onClick={() => sendReply({ resolve: false })}
                      type="button"
                    >
                      {isSubmitting ? "Sending..." : "Send Reply"}
                    </button>
                    <button
                      className="rb-btn-secondary h-11 w-full justify-center"
                      disabled={isSubmitting || selected.is_resolved}
                      onClick={() => updateMessageResolution(selected, true)}
                      type="button"
                    >
                      Mark as Resolved
                    </button>
                    <button
                      className="rounded-lg border border-teal-200 bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-50 disabled:pointer-events-none disabled:opacity-50"
                      disabled={!replyText.trim() || isSubmitting}
                      onClick={() => sendReply({ resolve: true })}
                      type="button"
                    >
                      Send Reply and Resolve
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/80 bg-white/75 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quick context</p>
                    <div className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                      <p>Priority: {selectedPriority.label}</p>
                      <p>Status: {selected.is_resolved ? "Resolved" : "Open"}</p>
                      <p>Last activity: {formatRelativeTime(getLastActivityAt(selected))}</p>
                    </div>
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

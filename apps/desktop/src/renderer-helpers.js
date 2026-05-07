(() => {
  const root = (window.RBD = window.RBD || {});

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const escapeAttr = escapeHtml;

  const joinHtml = (items) => items.filter(Boolean).join("");

  const truncate = (value, maxLength = 72) => {
    const text = String(value || "");
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}...`;
  };

  const formatShortDate = (value) => {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const formatSavedAt = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const formatFileSize = (size) => {
    const bytes = Number(size || 0);
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getApiErrorMessage = (error, fallbackMessage) => {
    const message = error?.message || "";
    if (message && !message.includes("Error invoking remote method")) return message;
    if (message.includes(":")) return message.split(":").pop().trim();
    return fallbackMessage || "We couldn't complete your request right now. Please try again in a moment.";
  };

  const isLikelyEmail = (value) => /\S+@\S+\.\S+/.test(String(value || ""));
  const isLikelyLink = (value) => /^(https?:\/\/|www\.)/i.test(String(value || "").trim()) || /^[\w-]+\.[a-z]{2,}/i.test(String(value || "").trim());
  const isLikelyJobLink = (value) => /^https?:\/\/\S+$/i.test(String(value || "").trim());

  const isMonthYearLike = (value) => {
    const text = String(value || "").trim();
    if (!text) return true;
    return /^(?:[A-Za-z]{3,9}\s+\d{4}|\d{1,2}\/\d{4}|\d{4})$/.test(text);
  };

  const buildPreviewQrDataUrl = (network) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <rect width="160" height="160" rx="12" fill="#ffffff"/>
        <rect x="18" y="18" width="36" height="36" rx="4" fill="#1f2937"/>
        <rect x="106" y="18" width="36" height="36" rx="4" fill="#1f2937"/>
        <rect x="18" y="106" width="36" height="36" rx="4" fill="#1f2937"/>
        <rect x="28" y="28" width="16" height="16" rx="2" fill="#ffffff"/>
        <rect x="116" y="28" width="16" height="16" rx="2" fill="#ffffff"/>
        <rect x="28" y="116" width="16" height="16" rx="2" fill="#ffffff"/>
        <rect x="70" y="26" width="10" height="10" rx="2" fill="#1f2937"/>
        <rect x="86" y="26" width="10" height="10" rx="2" fill="#1f2937"/>
        <rect x="60" y="48" width="10" height="10" rx="2" fill="#1f2937"/>
        <rect x="76" y="48" width="10" height="10" rx="2" fill="#1f2937"/>
        <rect x="92" y="48" width="10" height="10" rx="2" fill="#1f2937"/>
        <rect x="58" y="68" width="12" height="12" rx="2" fill="#1f2937"/>
        <rect x="76" y="68" width="12" height="12" rx="2" fill="#0f766e"/>
        <rect x="94" y="68" width="12" height="12" rx="2" fill="#1f2937"/>
        <rect x="60" y="88" width="10" height="10" rx="2" fill="#1f2937"/>
        <rect x="76" y="88" width="10" height="10" rx="2" fill="#1f2937"/>
        <rect x="92" y="88" width="10" height="10" rx="2" fill="#1f2937"/>
        <rect x="70" y="110" width="10" height="10" rx="2" fill="#1f2937"/>
        <rect x="86" y="110" width="10" height="10" rx="2" fill="#1f2937"/>
        <text x="80" y="147" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">${escapeHtml(network)} preview</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const icon = (name) => {
    const icons = {
      arrowRight: '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h12"/><path d="M10.5 4.5 16 10l-5.5 5.5"/></svg>',
      back: '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="m12 4-6 6 6 6"/><path d="M6 10h10"/></svg>',
      copy: '<svg aria-hidden="true" viewBox="0 0 20 20"><rect x="7" y="4.5" width="8.5" height="10.5" rx="2"/><path d="M4.5 12.5v-5a2 2 0 0 1 2-2h1"/></svg>',
      plus: '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 4v12"/><path d="M4 10h12"/></svg>',
      minus: '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h12"/></svg>',
      reload: '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M17 9a7 7 0 1 0-2.05 4.95"/><path d="M17 4v5h-5"/></svg>',
      trash: '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 6h12"/><path d="M8 6V4h4v2"/><path d="M6.5 6.5 7 16h6l.5-9.5"/></svg>',
      upload: '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 14V4"/><path d="m6 8 4-4 4 4"/><path d="M4 15v1h12v-1"/></svg>',
    };

    return icons[name] || "";
  };

  root.helpers = {
    buildPreviewQrDataUrl,
    escapeAttr,
    escapeHtml,
    formatFileSize,
    formatSavedAt,
    formatShortDate,
    getApiErrorMessage,
    icon,
    isLikelyEmail,
    isLikelyJobLink,
    isLikelyLink,
    isMonthYearLike,
    joinHtml,
    truncate,
  };
})();

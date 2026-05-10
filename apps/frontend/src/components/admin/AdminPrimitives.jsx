import { useState } from "react";
import { getApiErrorMessage } from "../../lib/apiError";

// Keep the admin tables dense enough for daily operations without making IDs and actions fight for space.
const defaultColumnWidths = {
  action_type: "9rem",
  actions: "13rem",
  active: "7rem",
  address: "20rem",
  amount: "8rem",
  actor_email: "13rem",
  created_at: "10rem",
  enabled: "7rem",
  label: "12rem",
  network_code: "8rem",
  payload: "18rem",
  plan_name: "13rem",
  price: "8rem",
  role: "7rem",
  state: "9rem",
  status: "9rem",
  target: "9rem",
  time: "10rem",
  user: "16rem",
  user_email: "14rem",
};

export const StatusPill = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
  };

  return <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
};

export const AdminTable = ({ columns, empty = "No records found.", rows }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
    <table className="min-w-full table-fixed divide-y divide-slate-200 text-left text-sm">
      <thead className="bg-slate-800 text-[11px] uppercase tracking-[0.12em] text-white">
        <tr>
          {columns.map((column) => {
            const isActionColumn = column.key === "actions";
            return (
              <th
                className={`whitespace-nowrap px-3 py-2.5 font-semibold ${isActionColumn ? "text-right" : ""}`}
                key={column.key}
                style={{ width: column.width || defaultColumnWidths[column.key] || "auto" }}
              >
                {column.label}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.length ? rows.map((row) => (
          <tr className="align-middle odd:bg-white even:bg-slate-50/70 hover:bg-teal-50/50" key={row.id || row.key}>
            {columns.map((column) => (
              <td className={`px-3 py-2 text-slate-700 ${column.key === "actions" ? "text-right" : ""} ${column.cellClassName || ""}`} key={column.key}>
                {column.render ? column.render(row) : row[column.key]}
              </td>
            ))}
          </tr>
        )) : (
          <tr>
            <td className="px-4 py-8 text-center text-sm font-medium text-slate-500" colSpan={columns.length}>{empty}</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export const ActionGroup = ({ children }) => <div className="inline-flex flex-wrap justify-end gap-1.5">{children}</div>;

export const ActionButton = ({ children, tone = "neutral", ...props }) => {
  const tones = {
    neutral: "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100",
    primary: "border-teal-600 bg-teal-600 text-white hover:border-teal-700 hover:bg-teal-700",
    warning: "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 hover:bg-amber-100",
    danger: "border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400 hover:bg-rose-100",
  };

  return (
    <button
      className={`inline-flex h-8 items-center justify-center rounded-md border px-2.5 text-xs font-semibold shadow-sm transition ${tones[tone] || tones.neutral}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
};

export const Feedback = ({ feedback }) => {
  if (!feedback) return null;

  const toneClass = feedback.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${toneClass}`}>{feedback.message}</div>;
};

export const Field = ({ label, ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
    <input className="rb-field h-10 px-3 py-2 text-sm" {...props} />
  </label>
);

export const SelectField = ({ children, label, ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
    <select className="rb-field h-10 px-3 py-2 text-sm" {...props}>{children}</select>
  </label>
);

export const CheckboxField = ({ checked, label, onChange }) => (
  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
    <input checked={checked} className="h-4 w-4 rounded border-slate-300 text-teal-600" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    {label}
  </label>
);

export const useAdminFeedback = () => {
  const [feedback, setFeedback] = useState(null);
  const showSuccess = (message) => setFeedback({ tone: "success", message });
  const showError = (error, fallback) => setFeedback({ tone: "error", message: getApiErrorMessage(error, fallback) });

  return { feedback, setFeedback, showError, showSuccess };
};

const panelTones = {
  default: "border-slate-200 bg-white",
  muted: "border-slate-200 bg-white/95",
  subtle: "border-slate-200 bg-slate-50/80",
  dark: "border-white/80 bg-slate-900 text-white",
};

const Panel = ({ as: Tag = "section", children, className = "", tone = "default", ...props }) => {
  return (
    <Tag
      className={`rounded-xl border p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)] ${panelTones[tone] || panelTones.default} ${className}`.trim()}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default Panel;

const panelTones = {
  default: "border-white/80 bg-white/90",
  muted: "border-white/80 bg-white/85",
  subtle: "border-slate-200 bg-slate-50/70",
  dark: "border-white/80 bg-slate-900 text-white",
};

const Panel = ({ as: Tag = "section", children, className = "", tone = "default" }) => {
  return (
    <Tag
      className={`rounded-[2rem] border p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${panelTones[tone] || panelTones.default} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
};

export default Panel;

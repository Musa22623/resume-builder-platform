const FieldGroup = ({ label, hint, className = "", children }) => {
  return (
    <div className={className}>
      {label ? <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label> : null}
      {children}
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
};

export default FieldGroup;

const PageTitleBar = ({ actions, subtitle, title }) => (
  <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 pt-1 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
      {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </header>
);

export default PageTitleBar;

const PageIntro = ({ eyebrow, title, description, badge, actions, className = "" }) => {
  return (
    <section className={`rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${className}`.trim()}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{eyebrow}</p> : null}
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description ? <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500">{description}</p> : null}
        </div>
        {badge || actions ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {badge ? <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{badge}</div> : null}
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default PageIntro;

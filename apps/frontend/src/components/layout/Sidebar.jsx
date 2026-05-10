import { NavLink } from "react-router-dom";
import { getUserDisplayName, getUserInitials, getUserSecondaryText } from "../../lib/userDisplay";

const navLinkClass = (isActive, isCollapsed) =>
  [
    "relative flex items-center overflow-visible rounded-lg border px-3 py-2.5 transition duration-200",
    isCollapsed ? "justify-center px-3" : "justify-between",
    isActive
      ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
      : "border-transparent bg-transparent text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800",
  ].join(" ");

const iconClass = (isActive) =>
  [
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-[0.08em] transition duration-200",
    isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700 group-hover:bg-teal-100 group-hover:text-teal-800",
  ].join(" ");

export const SidebarLinks = ({ isCollapsed, navItems }) => {
  return (
    <>
      {navItems.map((item) => (
        <NavLink aria-label={item.label} end key={item.to} title={item.description || item.label} to={item.to}>
          {({ isActive }) => (
            <div className={`group ${navLinkClass(isActive, isCollapsed)}`}>
              <span className={`flex min-w-0 items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                <span className={iconClass(isActive)} aria-hidden="true">
                  {item.icon}
                </span>
                {!isCollapsed ? (
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    {item.description ? (
                      <span className={`mt-0.5 block text-xs ${isActive ? "text-white/80" : "text-slate-500 group-hover:text-teal-700"}`}>
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>

              {isCollapsed ? (
                <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden w-max min-w-48 -translate-y-1/2 translate-x-2 rounded-lg border border-slate-200 bg-slate-950 px-4 py-3 text-left text-white opacity-0 shadow-[0_18px_50px_rgba(15,23,42,0.18)] transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 lg:block">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  {item.description ? <span className="mt-1 block text-xs leading-6 text-slate-300">{item.description}</span> : null}
                </span>
              ) : null}
            </div>
          )}
        </NavLink>
      ))}
    </>
  );
};

const Sidebar = ({ isCollapsed, navItems, onLogout, onToggleCollapse, user }) => {
  const adminLabel = user?.is_platform_admin || user?.is_staff ? "Admin access" : "Workspace";
  const displayName = getUserDisplayName(user);
  const secondaryText = getUserSecondaryText(user);
  const initials = getUserInitials(user);

  return (
    <aside
      className={[
        "relative rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)] lg:sticky lg:top-3 lg:flex lg:h-[calc(100vh-1.5rem)] lg:flex-shrink-0 lg:flex-col",
        isCollapsed ? "lg:w-[5.25rem]" : "lg:w-72",
      ].join(" ")}
    >
      <div className={`mb-4 flex flex-shrink-0 ${isCollapsed ? "justify-center" : "items-start justify-between gap-3"}`}>
        {!isCollapsed ? (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">Resume Builder</p>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">{adminLabel}</h1>
            </div>
            <div className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">Live</div>
          </>
        ) : null}

        {/* Keep the collapse toggle obvious so editing pages can reclaim space quickly. */}
        <button
          className={`inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 ${
            isCollapsed ? "h-10 w-10" : "h-10 gap-2 px-3 lg:absolute lg:right-3 lg:top-3"
          }`}
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          type="button"
        >
          {!isCollapsed ? <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Space</span> : null}
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white">
            <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
              <path
                d={isCollapsed ? "M6 3.5L10.5 8L6 12.5" : "M10 3.5L5.5 8L10 12.5"}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
              />
            </svg>
          </span>
        </button>
      </div>

      <nav className="grid gap-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        <SidebarLinks isCollapsed={isCollapsed} navItems={navItems} />
      </nav>

      <div className="flex-shrink-0">
        {!isCollapsed ? (
          <div className="mt-4 rounded-lg bg-slate-900 p-3 text-white">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Signed in as</p>
            <p className="mt-2 truncate text-sm font-semibold" title={displayName}>{displayName}</p>
            {secondaryText ? <p className="mt-1 truncate text-xs text-slate-300" title={secondaryText}>{secondaryText}</p> : null}
          </div>
        ) : (
          <div className="mt-4 flex justify-center">
            <div
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white"
              title={displayName}
            >
              {initials}
            </div>
          </div>
        )}

        <button
          className={`rb-btn-secondary mt-3 ${isCollapsed ? "w-full px-0" : "w-full"}`}
          onClick={onLogout}
          title={isCollapsed ? "Logout" : undefined}
          type="button"
        >
          {isCollapsed ? "Out" : "Logout"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

import { NavLink } from "react-router-dom";

const navLinkClass = (isActive) =>
  [
    "flex items-center justify-between rounded-2xl border px-4 py-3 transition duration-200",
    isActive
      ? "border-teal-600 bg-teal-600 text-white shadow-[0_18px_40px_rgba(13,148,136,0.22)]"
      : "border-transparent bg-white/70 text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800",
  ].join(" ");

const iconClass = (isActive) =>
  [
    "inline-flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold uppercase tracking-[0.12em] transition duration-200",
    isActive ? "bg-white/18 text-white" : "bg-slate-900 text-white group-hover:bg-teal-600",
  ].join(" ");

export const SidebarLinks = ({ navItems }) => {
  return (
    <>
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to}>
          {({ isActive }) => (
            <div className={`group ${navLinkClass(isActive)}`}>
              <span className="flex min-w-0 items-center gap-3">
                <span className={iconClass(isActive)}>{item.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">{item.label}</span>
                  {item.description ? (
                    <span className={`mt-0.5 block text-xs ${isActive ? "text-white/80" : "text-slate-500 group-hover:text-teal-700"}`}>
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </>
  );
};

const Sidebar = ({ navItems, onLogout, user }) => {
  const adminLabel = user?.is_platform_admin || user?.is_staff ? "Admin access" : "Workspace";

  return (
    <aside className="rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-72 lg:flex-shrink-0">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Resume Builder</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{adminLabel}</h1>
        </div>
        <div className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">Live</div>
      </div>

      <nav className="grid gap-2">
        <SidebarLinks navItems={navItems} />
      </nav>

      <div className="mt-6 rounded-3xl bg-slate-900 p-4 text-white">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Signed in as</p>
        <p className="mt-2 text-lg font-semibold">{user?.username}</p>
        <p className="mt-1 text-sm text-slate-300">{user?.email || "Account connected"}</p>
      </div>

      <button className="rb-btn-secondary mt-6 w-full" onClick={onLogout} type="button">
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;

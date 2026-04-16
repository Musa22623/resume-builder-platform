import { NavLink } from "react-router-dom";
import Sidebar from "./Sidebar";

const mobileNavLinkClass = ({ isActive }) =>
  [
    "inline-flex min-w-max items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition duration-200",
    isActive
      ? "border-teal-600 bg-teal-600 text-white"
      : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800",
  ].join(" ");

const AppLayout = ({ children, navItems, onLogout, user }) => {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6">
        <Sidebar navItems={navItems} onLogout={onLogout} user={user} />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex gap-2 overflow-x-auto rounded-[1.5rem] border border-white/70 bg-white/70 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur lg:hidden">
            {navItems.map((item) => (
              <NavLink key={item.to} className={mobileNavLinkClass} to={item.to}>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              className="rb-btn-secondary whitespace-nowrap px-4 py-3"
              onClick={onLogout}
              type="button"
            >
              Logout
            </button>
          </div>

          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;

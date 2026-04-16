import { Link } from "react-router-dom";

const PublicLayout = ({ children, user, logout }) => {
  return (
    <div className="min-h-screen bg-transparent">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <Link className="flex items-center gap-3" to="/">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">
              RB
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">AI Resume Studio</p>
              <p className="text-sm font-semibold text-slate-900">Resume Builder Platform</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a className="transition hover:text-slate-900" href="/#intro">
              Intro
            </a>
            <a className="transition hover:text-slate-900" href="/#desktop">
              Desktop App
            </a>
            <a className="transition hover:text-slate-900" href="/#contact">
              Contact
            </a>
            <a className="transition hover:text-slate-900" href="/#faq">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  className="rb-btn-secondary hidden px-4 py-2 sm:inline-flex"
                  to="/dashboard"
                >
                  Open App
                </Link>
                <button
                  className="rb-btn-dark px-4 py-2"
                  onClick={logout}
                  type="button"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="hidden text-sm font-semibold text-slate-700 transition hover:text-slate-900 sm:inline-flex" to="/login">
                  Login
                </Link>
                <Link
                  className="rb-btn-primary px-4 py-2"
                  to="/signup"
                >
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-200/80 bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <p>Resume Builder Platform for web and desktop workflows.</p>
          <div className="flex gap-4">
            <a href="/#contact">Support</a>
            <a href="/#faq">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;

import { useEffect, useId, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "./ThemeToggle";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "px-3 py-2 text-sm font-medium transition-colors border-b-2",
    isActive
      ? "border-cobalt text-navy"
      : "border-transparent text-muted hover:text-navy",
  ].join(" ");

const menuLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "block w-full rounded-[var(--radius-control)] px-3 py-3 text-sm font-medium transition-colors",
    isActive ? "bg-sky-tint text-chip-text" : "text-navy hover:bg-ice",
  ].join(" ");

export default function AppHeader() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut();
    navigate("/events", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border glass-panel">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6"
        aria-label="Main"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cobalt text-4xl text-white"
            aria-hidden
          >
            🏐
          </span>
          <div className="flex min-w-0 shrink-0 flex-col justify-center pl-1">
            <Link
              to="/events"
              className="font-display flex shrink-0 items-center gap-3 text-3xl leading-tight font-extrabold tracking-tight text-navy"
            >
              HAMPAS
            </Link>
            <span className="font-display block text-xs font-extrabold leading-tight tracking-wider text-muted">
              FIND · PLAY · ENJOY
            </span>
          </div>
        </div>

        {/* Desktop / tablet nav */}
        <div className="hidden items-center justify-end gap-1 md:flex md:gap-2">
          <NavLink to="/events" className={linkClass}>
            Events
          </NavLink>
          {!loading && user && (
            <>
              <NavLink to="/me/applications" className={linkClass}>
                My applications
              </NavLink>
              <NavLink to="/profile" className={linkClass}>
                Profile
              </NavLink>
              {user.is_admin ? (
                <>
                  <NavLink to="/admin/role-requests" className={linkClass}>
                    Role requests
                  </NavLink>
                  <NavLink to="/admin/event-requests" className={linkClass}>
                    Event requests
                  </NavLink>
                </>
              ) : null}
              <Link
                to="/events/new"
                className="rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric"
              >
                Create event
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 hover:text-red-800"
              >
                Log out
              </button>
            </>
          )}
          {!loading && !user && (
            <Link
              to="/login"
              className="rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric"
            >
              Log in
            </Link>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />

          {/* Mobile hamburger */}
          <div className="relative md:hidden">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-navy"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <span className="text-xl leading-none" aria-hidden>
                  ×
                </span>
              ) : (
                <span className="flex flex-col gap-1.5" aria-hidden>
                  <span className="block h-0.5 w-5 rounded-full bg-navy" />
                  <span className="block h-0.5 w-5 rounded-full bg-navy" />
                  <span className="block h-0.5 w-5 rounded-full bg-navy" />
                </span>
              )}
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default bg-navy/20"
                  aria-label="Dismiss menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  id={menuId}
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-[var(--radius-card)] border border-border bg-surface p-2 shadow-soft"
                >
                  <NavLink
                    to="/events"
                    role="menuitem"
                    className={menuLinkClass}
                  >
                    Events
                  </NavLink>
                  {!loading && user && (
                    <>
                      <NavLink
                        to="/me/applications"
                        role="menuitem"
                        className={menuLinkClass}
                      >
                        My applications
                      </NavLink>
                      <NavLink
                        to="/profile"
                        role="menuitem"
                        className={menuLinkClass}
                      >
                        Profile
                      </NavLink>
                      {user.is_admin ? (
                        <>
                          <NavLink
                            to="/admin/role-requests"
                            role="menuitem"
                            className={menuLinkClass}
                          >
                            Role requests
                          </NavLink>
                          <NavLink
                            to="/admin/event-requests"
                            role="menuitem"
                            className={menuLinkClass}
                          >
                            Event requests
                          </NavLink>
                        </>
                      ) : null}
                      <Link
                        to="/events/new"
                        role="menuitem"
                        className="mt-1 block w-full rounded-[var(--radius-control)] bg-cobalt px-3 py-3 text-center text-sm font-semibold text-white hover:bg-electric"
                      >
                        Create event
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="mt-1 block w-full rounded-[var(--radius-control)] border border-red-100 bg-red-50 px-3 py-3 text-center text-sm font-medium text-red-700 hover:bg-red-200 hover:text-red-800"
                      >
                        Log out
                      </button>
                    </>
                  )}
                  {!loading && !user && (
                    <Link
                      to="/login"
                      role="menuitem"
                      className="mt-1 block w-full rounded-[var(--radius-control)] bg-cobalt px-3 py-3 text-center text-sm font-semibold text-white hover:bg-electric"
                    >
                      Log in
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

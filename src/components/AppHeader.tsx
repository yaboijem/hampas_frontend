import { useEffect, useId, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAdminPendingCountsContext } from "../admin/AdminPendingCountsContext";
import { useAuth } from "../auth/AuthContext";
import { showToast } from "../lib/adminNotifications";
import AdminPendingBadge from "./AdminPendingBadge";
import CreateEventControl from "./CreateEventControl";
import NotificationsBell from "./NotificationsBell";
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

function LogoutIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function AppHeader() {
  const { user, loading, signOut } = useAuth();
  const { counts } = useAdminPendingCountsContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const adminLinkClass = ({ isActive }: { isActive: boolean }) =>
    linkClass({
      isActive: isActive || location.pathname.startsWith("/admin"),
    });

  const adminMenuLinkClass = ({ isActive }: { isActive: boolean }) =>
    menuLinkClass({
      isActive: isActive || location.pathname.startsWith("/admin"),
    });

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
    showToast("You've been logged\u00a0out.");
    navigate("/events", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border glass-panel pt-safe">
      <nav
        className="mx-auto flex max-w-6xl items-center gap-2 px-header-safe py-3 sm:gap-3"
        aria-label="Main"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
          <span className="brand-ball shrink-0" aria-hidden>
            <span className="brand-ball__glyph">🏐</span>
          </span>
          <div className="min-w-0 flex-1 flex-col justify-center pl-0.5 sm:pl-1">
            <Link
              to="/events"
              className="font-display block truncate text-xl leading-tight font-extrabold tracking-tight text-navy sm:text-3xl"
            >
              HAMPAS
            </Link>
            <span className="font-display block truncate text-[0.65rem] font-extrabold leading-tight tracking-wider text-muted sm:text-xs">
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
              <NavLink to="/me/hosted-events" className={linkClass}>
                Hosted events
              </NavLink>
              <NavLink to="/profile" className={linkClass}>
                Profile
              </NavLink>
              {user.is_admin ? (
                <NavLink to="/admin/requests" className={adminLinkClass}>
                  <span className="inline-flex items-center">
                    Admin
                    <AdminPendingBadge count={counts.total} />
                  </span>
                </NavLink>
              ) : null}
              <CreateEventControl variant="header" />
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Log out"
                title="Log out"
                className="logout-btn inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-solid transition sm:h-11 sm:w-11"
              >
                <LogoutIcon />
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

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {!loading && user ? <NotificationsBell /> : null}
          <ThemeToggle className="!h-10 !w-10 !px-0 sm:!h-11 sm:!w-11" />

          {/* Mobile hamburger */}
          <div className="relative md:hidden">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-navy sm:h-11 sm:w-11"
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
                        to="/me/hosted-events"
                        role="menuitem"
                        className={menuLinkClass}
                      >
                        Hosted events
                      </NavLink>
                      <NavLink
                        to="/profile"
                        role="menuitem"
                        className={menuLinkClass}
                      >
                        Profile
                      </NavLink>
                      {user.is_admin ? (
                        <NavLink
                          to="/admin/requests"
                          role="menuitem"
                          className={adminMenuLinkClass}
                        >
                          <span className="inline-flex items-center">
                            Admin
                            <AdminPendingBadge count={counts.total} />
                          </span>
                        </NavLink>
                      ) : null}
                      <CreateEventControl variant="menu" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        aria-label="Log out"
                        className="logout-btn mt-1 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-solid px-3 py-3 text-sm font-medium transition"
                      >
                        <LogoutIcon size={18} />
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

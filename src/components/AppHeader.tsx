import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ThemeToggle from './ThemeToggle';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-sky-tint text-chip-text' : 'text-muted hover:text-navy',
  ].join(' ');

const menuLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block w-full rounded-[var(--radius-control)] px-3 py-3 text-sm font-medium transition-colors',
    isActive ? 'bg-sky-tint text-chip-text' : 'text-navy hover:bg-ice',
  ].join(' ');

function formatClock(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AppHeader() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const menuId = useId();

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border glass-panel">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6"
        aria-label="Main"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            to={user ? '/events' : '/'}
            className="font-display flex shrink-0 items-center gap-3 text-lg font-extrabold tracking-tight text-navy"
          >
            Hampas
            <span
              className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-cobalt text-xl text-white"
              aria-hidden
            >
              🏐
            </span>
          </Link>
          <div className="flex min-w-0 shrink items-center pl-2 gap-2 overflow-hidden sm:gap-3">
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted sm:px-3 sm:text-xs">
              📍 Angeles City
            </span>
            <time
              dateTime={now.toISOString()}
              className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted sm:px-3 sm:text-xs"
              aria-live="polite"
              aria-label={`Current time ${formatClock(now)}`}
            >
              {formatClock(now)}
            </time>
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
              <Link
                to="/events/new"
                className="rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric"
              >
                Create event
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-medium text-muted hover:text-navy"
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
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
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
                  <NavLink to="/events" role="menuitem" className={menuLinkClass}>
                    Events
                  </NavLink>
                  {!loading && user && (
                    <>
                      <NavLink to="/me/applications" role="menuitem" className={menuLinkClass}>
                        My applications
                      </NavLink>
                      <NavLink to="/profile" role="menuitem" className={menuLinkClass}>
                        Profile
                      </NavLink>
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
                        className="mt-1 block w-full rounded-[var(--radius-control)] border border-border px-3 py-3 text-left text-sm font-medium text-muted hover:bg-ice hover:text-navy"
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

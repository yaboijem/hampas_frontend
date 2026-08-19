import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoleRequest } from '../api/profiles';
import type { ElevatedRole } from '../api/types';
import { getRoleRequestCopy } from '../content/roleRequestCopy';
import { showToast } from '../lib/adminNotifications';
import { isScrolledToBottom } from '../lib/scrollBottom';

type Props = {
  role: ElevatedRole;
  onClose: () => void;
  onSubmitted?: () => void;
};

export default function RoleRequestModal({ role, onClose, onSubmitted }: Props) {
  const copy = getRoleRequestCopy(role);
  const titleId = useId();
  const noteId = useId();
  const acceptId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const measure = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtBottom(isScrolledToBottom(el));
  };

  useEffect(() => {
    setAccepted(false);
    setNote('');
    setError(null);
    setAtBottom(false);
    const id = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
    });
    return () => cancelAnimationFrame(id);
  }, [role]);

  useEffect(() => {
    if (!atBottom && accepted) setAccepted(false);
  }, [atBottom, accepted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [busy, onClose]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [role]);

  const canSubmit = atBottom && accepted && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const trimmed = note.trim();
      await createRoleRequest({
        role,
        ...(trimmed ? { note: trimmed } : {}),
      });
      showToast(
        role === 'coach' ? 'Coach request submitted.' : 'Organizer request submitted.',
      );
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex min-h-dvh w-full items-center justify-center bg-navy/45 p-4"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
      }}
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="my-auto flex max-h-[min(92dvh,40rem)] w-full max-w-md shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface text-navy shadow-soft"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 id={titleId} className="font-display text-lg font-bold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Read the privileges and rules below, then accept to continue.
          </p>
        </div>

        <form onSubmit={(ev) => void submit(ev)} className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollerRef}
            onScroll={measure}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6"
            data-testid="role-request-scroll"
          >
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-chip-text">
                {copy.privilegesHeading}
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-navy">
                {copy.privileges.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-chip-text">
                {copy.rulesHeading}
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-navy">
                {copy.rules.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            {!atBottom ? (
              <p className="text-xs font-medium text-muted">Scroll to the end to enable accept.</p>
            ) : null}
          </div>

          <div className="space-y-3 border-t border-border px-5 py-4 sm:px-6">
            {error ? (
              <p role="alert" className="text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <label
              htmlFor={acceptId}
              className={`flex items-start gap-2 text-sm ${atBottom ? 'text-navy' : 'text-muted'}`}
            >
              <input
                id={acceptId}
                type="checkbox"
                className="mt-0.5"
                disabled={!atBottom || busy}
                checked={accepted}
                onChange={(ev) => setAccepted(ev.target.checked)}
              />
              <span>{copy.acceptLabel}</span>
            </label>

            <label htmlFor={noteId} className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-chip-text">
                {copy.noteLabel}
              </span>
              <textarea
                id={noteId}
                rows={3}
                maxLength={500}
                disabled={busy}
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                placeholder={copy.notePlaceholder}
                className="mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy shadow-sm outline-none placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 disabled:opacity-60"
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric disabled:opacity-60"
              >
                {busy ? 'Submitting…' : copy.submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

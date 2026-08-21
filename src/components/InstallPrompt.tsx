import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const AUTO_HIDE_MS = 3500;

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      const stored = (window as unknown as Record<string, unknown>).__hampasInstallEvent;
      setDeferred((stored as BeforeInstallPromptEvent) ?? (e as BeforeInstallPromptEvent));
    };
    const onInstalled = () => {
      setDeferred(null);
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!deferred || dismissed) return;
    const id = window.setTimeout(() => setDismissed(true), AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [deferred, dismissed]);

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    setDeferred(null);
  };

  return (
    <div
      data-testid="install-prompt"
      className="fixed top-safe-offset-4 right-safe-offset-4 z-50 flex max-w-[min(100vw-2rem,22rem)] items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 text-sm text-navy shadow-soft sm:p-4"
      role="status"
    >
      <span className="min-w-0 flex-1">Install Hampas on your device.</span>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-[var(--radius-control)] bg-cobalt px-3 py-1 text-white hover:bg-electric"
      >
        Install app
      </button>
    </div>
  );
}

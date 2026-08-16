import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

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

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    setDeferred(null);
  };

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-navy shadow-soft">
      <span>Install Hampas on your device.</span>
      <button onClick={install} className="bg-blue-700 px-3 py-1 text-white">Install app</button>
      <button onClick={() => setDismissed(true)} className="px-2 text-muted">Dismiss</button>
    </div>
  );
}

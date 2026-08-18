import { useTheme } from '../theme/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const next = resolvedTheme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} mode`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-navy transition-colors hover:border-cobalt',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {resolvedTheme === 'dark' ? (
        <span aria-hidden className="text-base leading-none">
          ☀
        </span>
      ) : (
        <span aria-hidden className="text-base leading-none">
          ☾
        </span>
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}

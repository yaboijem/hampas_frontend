import { useTheme } from '../theme/ThemeContext';
import type { ThemePreference } from '../theme/theme';

const LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  if (preference === 'dark') {
    return (
      <span aria-hidden className="text-base leading-none">
        ☾
      </span>
    );
  }
  if (preference === 'light') {
    return (
      <span aria-hidden className="text-base leading-none">
        ☀
      </span>
    );
  }
  return (
    <span aria-hidden className="text-base leading-none">
      ◐
    </span>
  );
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { preference, cyclePreference } = useTheme();
  const label = `Theme: ${LABELS[preference]}`;

  return (
    <button
      type="button"
      onClick={cyclePreference}
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm font-medium text-muted transition-colors hover:text-navy',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ThemeIcon preference={preference} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

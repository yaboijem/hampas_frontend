import { useId, useState } from 'react';

const fieldClass =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface py-2 pl-3 pr-11 text-sm text-navy shadow-sm outline-none transition placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-chip-text';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
};

export default function PasswordField({
  id: idProp,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  disabled,
}: Props) {
  const genId = useId();
  const id = idProp ?? genId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="block">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <span className="relative mt-1 block">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          disabled={disabled}
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-navy"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>
    </div>
  );
}

type Props = {
  label: string;
  selected: boolean;
  onClick: () => void;
  'aria-label'?: string;
  icon?: string;
};

export default function FilterChip({
  label,
  selected,
  onClick,
  'aria-label': ariaLabel,
  icon,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel ?? label}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/40 focus-visible:ring-offset-2',
        selected
          ? 'border-cobalt/20 bg-gradient-to-b from-sky-tint to-[#dbeafe] text-chip-text shadow-[0_2px_10px_rgb(37_99_235_/_0.15)] ring-1 ring-cobalt/15'
          : 'border-border/80 bg-surface text-muted shadow-sm hover:border-electric/50 hover:bg-ice hover:text-navy hover:shadow-soft',
      ].join(' ')}
    >
      {icon ? (
        <span className="text-base leading-none" aria-hidden>
          {icon}
        </span>
      ) : null}
      {label}
    </button>
  );
}

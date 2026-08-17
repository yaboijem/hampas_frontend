type Props = {
  count: number;
  label?: string;
  tone?: 'default' | 'onCobalt';
};

export default function AdminPendingBadge({
  count,
  label = 'pending',
  tone = 'default',
}: Props) {
  if (count <= 0) return null;
  const text = count > 99 ? '99+' : String(count);
  const toneClass =
    tone === 'onCobalt'
      ? 'bg-white text-cobalt'
      : 'bg-cobalt text-white';
  return (
    <span
      className={`ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${toneClass}`}
      aria-label={`${count} ${label}`}
    >
      {text}
    </span>
  );
}

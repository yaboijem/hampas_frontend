type Props = {
  size?: number;
  className?: string;
};

/** App favicon mark (volleyball) — use instead of 🏐 emoji. */
export default function BrandMark({ size = 20, className = '' }: Props) {
  return (
    <img
      src="/favicon.png"
      alt=""
      width={size}
      height={size}
      draggable={false}
      aria-hidden
      className={['inline-block shrink-0 object-contain align-middle', className]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

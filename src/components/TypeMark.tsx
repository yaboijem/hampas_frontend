import { typeEmoji } from '../events/eventLabels';
import BrandMark from './BrandMark';

type Props = {
  type: string;
  size?: number;
  className?: string;
};

/** Event-type icon: brand mark for open play / unknown, else emoji. */
export default function TypeMark({ type, size = 14, className = '' }: Props) {
  const emoji = typeEmoji(type);
  if (!emoji) {
    return <BrandMark size={size} className={className} />;
  }
  return (
    <span aria-hidden className={className}>
      {emoji}
    </span>
  );
}

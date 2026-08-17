import type { WeatherCondition } from '../api/weather';

type IconProps = {
  className?: string;
  size?: number;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

function svgBase(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: cx('inline-block shrink-0', className),
    'aria-hidden': true as const,
  };
}

export function SunIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size, cx('text-amber-500', className))} stroke="currentColor">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

/** Cloud body: white fill + blue stroke */
export function CloudIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size, cx('text-sky-500', className))}>
      <path
        d="M7.5 18a4.5 4.5 0 0 1-.4-9 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 18H7.5z"
        fill="white"
        stroke="currentColor"
      />
    </svg>
  );
}

export function RainIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size, className)}>
      <path
        d="M7.5 16a4.5 4.5 0 0 1-.4-9 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 16H7.5z"
        fill="white"
        stroke="currentColor"
        className="text-sky-500"
      />
      <path d="M9 18v2M12 17v3M15 18v2" stroke="currentColor" className="text-blue-500" />
    </svg>
  );
}

export function StormIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size, className)}>
      <path
        d="M7.5 15a4.5 4.5 0 0 1-.4-9 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 15H7.5z"
        fill="white"
        stroke="currentColor"
        className="text-sky-500"
      />
      <path
        d="M13 14l-2 4h3l-2 4"
        fill="currentColor"
        stroke="currentColor"
        className="text-blue-600"
      />
    </svg>
  );
}

export function WindIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size, cx('text-cyan-500', className))} stroke="currentColor">
      <path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12h15a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16h8a2 2 0 1 1-2 2" />
    </svg>
  );
}

export function DropletsIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...svgBase(size, cx('text-blue-500', className))} stroke="currentColor">
      <path
        d="M9 2.3C11.8 4.7 15 9.4 15 12.7a6 6 0 1 1-12 0C3 9.4 6.2 4.7 9 2.3z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        d="M17.5 0.6C19.3 2.2 21.5 5.3 21.5 7.5a4 4 0 1 1-8 0C13.5 5.3 15.7 2.2 17.5 0.6z"
        fill="currentColor"
        fillOpacity={0.2}
      />
    </svg>
  );
}

export function ConditionIcon({
  condition,
  className,
  size = 14,
}: IconProps & { condition: WeatherCondition }) {
  switch (condition) {
    case 'sunny':
      return <SunIcon className={className} size={size} />;
    case 'cloudy':
      return <CloudIcon className={className} size={size} />;
    case 'rain':
      return <RainIcon className={className} size={size} />;
    case 'storm':
      return <StormIcon className={className} size={size} />;
  }
}

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

export function PhoneIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size, className)} stroke="currentColor">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function EmailIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size, className)} stroke="currentColor">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

export function FacebookIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size, className)} stroke="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function InstagramIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size, className)} stroke="currentColor">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

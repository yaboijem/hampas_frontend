import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ONBOARDING_SLIDES } from '../onboarding/slides';
import { readOnboardingDone, writeOnboardingDone } from '../onboarding/storage';

const ghostBtn =
  'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-transparent px-3 py-2 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50';

const ghostBtnDark =
  'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-transparent px-3 py-2 text-sm font-semibold text-navy transition hover:bg-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/40';

const lastIndex = ONBOARDING_SLIDES.length - 1;
const EXIT_MS = 420;
const SWIPE_MIN = 48;

type Props = {
  /** Called after exit animation, once storage is written — parent should mount app shell. */
  onFinished?: () => void;
};

export default function OnboardingGate({ onFinished }: Props) {
  const navigate = useNavigate();
  const [done, setDone] = useState(() => readOnboardingDone());
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const ignoreTapUntil = useRef(0);

  useEffect(() => {
    if (done) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [done]);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, lastIndex));
  }, []);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const skipToPolicies = () => setIndex(lastIndex);

  const complete = () => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => {
      writeOnboardingDone();
      setDone(true);
      onFinished?.();
      navigate('/events', { replace: true });
    }, EXIT_MS);
  };

  useEffect(() => {
    if (done || exiting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, exiting, goNext, goPrev]);

  if (done) return null;

  const slide = ONBOARDING_SLIDES[index];
  const isLast = index === lastIndex;
  const isFirst = index === 0;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy)) return;
    ignoreTapUntil.current = Date.now() + 350;
    if (dx < 0) goNext();
    else goPrev();
  };

  const onSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() < ignoreTapUntil.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, label, [data-no-nav]')) return;
    if (isLast) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) goPrev();
    else goNext();
  };

  return (
    <div
      className={`onboarding-shell fixed inset-0 z-[100] flex flex-col text-white ${
        exiting ? 'onboarding-exit' : 'onboarding-enter'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative flex min-h-0 flex-1 flex-col" onClick={onSurfaceClick}>
        {slide.kind === 'image' ? (
          <>
            <img
              src={slide.imageSrc}
              alt=""
              className="onboarding-bg-image absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
            <div className="onboarding-image-scrim absolute inset-0" aria-hidden />

            {isFirst ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-5">
                <div
                  className="onboarding-welcome"
                  role="group"
                  aria-label="Welcome to Hampas App"
                >
                  <span className="onboarding-welcome__kicker">Welcome to</span>
                  <span className="onboarding-welcome__brand">HAMPAS</span>
                  <span className="onboarding-welcome__rule" aria-hidden />
                  <span className="onboarding-welcome__tag">FIND · PLAY · ENJOY</span>
                </div>
              </div>
            ) : null}

            <div className="onboarding-copy relative z-10 mt-auto flex flex-col gap-3 px-6 px-safe pb-24 pt-16 sm:px-10 sm:pb-28">
              <h1 id="onboarding-title" className="onboarding-slide-title">
                {slide.title}
              </h1>
              <p className="onboarding-slide-body max-w-md">{slide.body}</p>
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-ice text-navy pt-safe">
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 px-safe py-10 pb-28 sm:px-8 sm:py-12">
              <h1 id="onboarding-title" className="onboarding-slide-title onboarding-slide-title--dark">
                {slide.title}
              </h1>

              <section className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-chip-text">
                  Features
                </h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed sm:text-base">
                  {slide.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-chip-text">
                  Policies
                </h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed sm:text-base">
                  {slide.policies.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <p className="text-sm text-muted" data-no-nav>
                Read the full{' '}
                <a
                  href={slide.termsPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-cobalt underline"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href={slide.privacyPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-cobalt underline"
                >
                  Privacy Policy
                </a>
                .
              </p>

              <button
                type="button"
                onClick={complete}
                data-no-nav
                className={`${ghostBtnDark} w-full border border-navy/25 sm:w-auto`}
              >
                Get Started
              </button>
            </div>
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 px-5 px-safe pt-5 pb-safe-max-5 sm:px-10"
          data-no-nav
        >
          {slide.kind === 'image' ? (
            <>
              <button
                type="button"
                onClick={skipToPolicies}
                className={`${ghostBtn} pointer-events-auto text-white/90 hover:text-white`}
              >
                Skip
              </button>
              <div className="flex items-center gap-2" aria-label="Progress">
                {ONBOARDING_SLIDES.map((s, i) => (
                  <span
                    key={s.id}
                    className={
                      i === index
                        ? 'h-1.5 w-4 rounded-full bg-white shadow-[0_0_0_1px_rgb(255_255_255_/_0.35)]'
                        : 'h-1.5 w-1.5 rounded-full bg-white/70 ring-1 ring-white/40'
                    }
                    aria-current={i === index ? 'step' : undefined}
                  />
                ))}
              </div>
              <div className="pointer-events-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={isFirst}
                  className={`${ghostBtn} text-white/90 hover:text-white disabled:opacity-30`}
                  aria-label="Previous slide"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isLast}
                  className={`${ghostBtn} text-white hover:text-white disabled:opacity-30`}
                  aria-label="Next slide"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={goPrev}
                className={`${ghostBtnDark} pointer-events-auto`}
                aria-label="Previous slide"
              >
                Prev
              </button>
              <div className="flex items-center gap-2" aria-label="Progress">
                {ONBOARDING_SLIDES.map((s, i) => (
                  <span
                    key={s.id}
                    className={
                      i === index
                        ? 'h-1.5 w-4 rounded-full bg-cobalt'
                        : 'h-1.5 w-1.5 rounded-full bg-navy/25'
                    }
                    aria-current={i === index ? 'step' : undefined}
                  />
                ))}
              </div>
              <span className="min-w-[3.5rem]" aria-hidden />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

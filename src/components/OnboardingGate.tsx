import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ONBOARDING_SLIDES } from '../onboarding/slides';
import { readOnboardingDone, writeOnboardingDone } from '../onboarding/storage';

const ghostBtnDark =
  'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-transparent px-3 py-2 text-sm font-semibold text-navy transition hover:bg-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/40';

const EXIT_MS = 420;
const MIN_LOAD_MS = 1000;
/** Cap while favicon still loading so the bar doesn't fake 100%. */
const ASSET_PENDING_CAP = 0.88;
const PROGRESS_COLOR = '#D97706';

type Props = {
  /** Called after exit animation, once storage is written — parent should mount app shell. */
  onFinished?: () => void;
};

type Phase = 'loading' | 'policies';

function loadProgress(elapsedMs: number, assetReady: boolean): number {
  const timeRatio = Math.min(1, elapsedMs / MIN_LOAD_MS);
  if (!assetReady) return Math.min(ASSET_PENDING_CAP, timeRatio) * 100;
  return timeRatio * 100;
}

export default function OnboardingGate({ onFinished }: Props) {
  const navigate = useNavigate();
  const [done, setDone] = useState(() => readOnboardingDone());
  const [phase, setPhase] = useState<Phase>('loading');
  const [exiting, setExiting] = useState(false);
  const [assetReady, setAssetReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [progress, setProgress] = useState(0);
  const loadStartedAt = useRef<number | null>(null);
  const assetReadyRef = useRef(false);

  const slide = ONBOARDING_SLIDES[0];

  useEffect(() => {
    if (done) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [done]);

  const markAssetReady = () => {
    assetReadyRef.current = true;
    setAssetReady(true);
  };

  useEffect(() => {
    if (done || phase !== 'loading') return;
    const id = window.setTimeout(() => setMinElapsed(true), MIN_LOAD_MS);
    return () => window.clearTimeout(id);
  }, [done, phase]);

  useEffect(() => {
    if (done || phase !== 'loading') return;
    loadStartedAt.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const start = loadStartedAt.current ?? now;
      const elapsed = now - start;
      const next = loadProgress(elapsed, assetReadyRef.current);
      setProgress(next);
      if (elapsed < MIN_LOAD_MS || !assetReadyRef.current) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setProgress(100);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [done, phase]);

  useEffect(() => {
    if (phase !== 'loading' || !assetReady) return;
    const start = loadStartedAt.current ?? performance.now();
    const elapsed = performance.now() - start;
    setProgress(loadProgress(elapsed, true));
  }, [phase, assetReady]);

  useEffect(() => {
    if (phase === 'loading' && assetReady && minElapsed) {
      setProgress(100);
      setPhase('policies');
    }
  }, [phase, assetReady, minElapsed]);

  const complete = () => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => {
      writeOnboardingDone();
      navigate('/events', { replace: true });
      setDone(true);
      onFinished?.();
    }, EXIT_MS);
  };

  const onBallImg = (el: HTMLImageElement | null) => {
    if (!el) return;
    if (el.complete) markAssetReady();
  };

  if (done) return null;

  if (phase === 'loading') {
    return (
      <div
        className={`onboarding-shell fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ice text-navy ${
          exiting ? 'onboarding-exit' : 'onboarding-enter'
        }`}
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label="Loading Hampas"
      >
        <div className="flex flex-col items-center gap-6">
          <span className="brand-ball shrink-0" data-testid="onboarding-loading-ball" aria-hidden>
            <img
              ref={onBallImg}
              className="brand-ball__glyph"
              src="/favicon.png"
              alt=""
              width={43}
              height={43}
              draggable={false}
              onLoad={markAssetReady}
              onError={markAssetReady}
            />
          </span>
          <div
            className="h-0.5 w-40 overflow-hidden rounded-full bg-navy/10 sm:w-48"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label="Loading progress"
            data-testid="onboarding-load-progress"
          >
            <div
              className="h-full origin-left rounded-full transition-[width] duration-75 ease-linear"
              style={{ width: `${progress}%`, backgroundColor: PROGRESS_COLOR }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`onboarding-shell fixed inset-0 z-[100] flex flex-col text-navy ${
        exiting ? 'onboarding-exit' : 'onboarding-enter'
      }`}
      role="dialog"
      aria-modal="true"
      aria-busy="false"
      aria-labelledby="onboarding-title"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-ice text-navy pt-safe">
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))] py-10 pb-28 text-center sm:pl-[max(2rem,env(safe-area-inset-left,0px))] sm:pr-[max(2rem,env(safe-area-inset-right,0px))] sm:py-12">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-chip-text">
                IMPORTANT NOTICE
              </p>
              <h1
                id="onboarding-title"
                className="onboarding-slide-title onboarding-slide-title--dark"
              >
                {slide.title}
              </h1>
            </div>

            <section className="space-y-2 text-left">
              <h2 className="text-xs font-bold uppercase tracking-wide text-chip-text">
                Features
              </h2>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed sm:text-base">
                {slide.features.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="space-y-2 text-left">
              <h2 className="text-xs font-bold uppercase tracking-wide text-chip-text">
                Policies
              </h2>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed sm:text-base">
                {slide.policies.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <p className="text-sm text-muted">
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
                Privacy&nbsp;Policy
              </a>
              .
            </p>

            <button
              type="button"
              onClick={complete}
              className={`${ghostBtnDark} mx-auto w-full border border-navy/25 sm:w-auto`}
            >
              Get Started
            </button>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] pt-5 pb-safe-max-5 sm:pl-[max(2.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(2.5rem,env(safe-area-inset-right,0px))]"
          aria-hidden
        />
      </div>
    </div>
  );
}

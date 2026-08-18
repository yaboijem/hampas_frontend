import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ONBOARDING_SLIDES } from '../onboarding/slides';
import { readOnboardingDone, writeOnboardingDone } from '../onboarding/storage';

const primaryBtn =
  'inline-flex items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-electric';

const lastIndex = ONBOARDING_SLIDES.length - 1;

export default function OnboardingGate() {
  const [done, setDone] = useState(() => readOnboardingDone());
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (done) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [done]);

  if (done) return null;

  const slide = ONBOARDING_SLIDES[index];
  const isLast = index === lastIndex;

  const complete = () => {
    writeOnboardingDone();
    setDone(true);
  };

  const goNext = () => {
    if (!isLast) setIndex((i) => Math.min(i + 1, lastIndex));
  };

  const skipToPolicies = () => setIndex(lastIndex);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-navy text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      {slide.kind === 'image' ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <img
            src={slide.imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
          <div className="relative z-10 mt-auto flex flex-col gap-3 px-6 pb-4 pt-24 sm:px-10 sm:pb-6">
            <h1
              id="onboarding-title"
              className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
            >
              {slide.title}
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
              {slide.body}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-ice text-navy">
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10 sm:px-8 sm:py-12">
            <h1
              id="onboarding-title"
              className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
            >
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

            <p className="text-sm text-muted">
              Read the full{' '}
              <Link to={slide.termsPath} className="font-semibold text-cobalt underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to={slide.privacyPath} className="font-semibold text-cobalt underline">
                Privacy Policy
              </Link>
              .
            </p>

            <button type="button" onClick={complete} className={`${primaryBtn} w-full sm:w-auto`}>
              Get Started
            </button>
          </div>
        </div>
      )}

      <div
        className={
          slide.kind === 'image'
            ? 'relative z-10 flex items-center justify-between gap-3 bg-black/40 px-6 py-4 backdrop-blur-sm sm:px-10'
            : 'flex items-center justify-center gap-3 border-t border-border bg-surface px-6 py-4'
        }
      >
        {slide.kind === 'image' ? (
          <>
            <button
              type="button"
              onClick={skipToPolicies}
              className="min-h-11 px-2 text-sm font-medium text-white/90 hover:text-white"
            >
              Skip
            </button>
            <div className="flex items-center gap-2" aria-label="Progress">
              {ONBOARDING_SLIDES.map((s, i) => (
                <span
                  key={s.id}
                  className={
                    i === index
                      ? 'h-2 w-6 rounded-full bg-white'
                      : 'h-2 w-2 rounded-full bg-white/40'
                  }
                  aria-current={i === index ? 'step' : undefined}
                />
              ))}
            </div>
            <button type="button" onClick={goNext} className={primaryBtn}>
              Next
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2" aria-label="Progress">
            {ONBOARDING_SLIDES.map((s, i) => (
              <span
                key={s.id}
                className={
                  i === index
                    ? 'h-2 w-6 rounded-full bg-cobalt'
                    : 'h-2 w-2 rounded-full bg-border'
                }
                aria-current={i === index ? 'step' : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

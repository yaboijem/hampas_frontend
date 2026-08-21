export type PoliciesSlide = {
  kind: 'policies';
  id: string;
  title: string;
  features: string[];
  policies: string[];
  termsPath: '/terms';
  privacyPath: '/privacy';
};

export type OnboardingSlide = PoliciesSlide;

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    kind: 'policies',
    id: 'policies',
    title: 'Before you play',
    features: [
      'Discover events near you',
      'Apply to join games',
      'Host events when eligible',
      'Get notifications about your\u00A0activity',
    ],
    policies: [
      'You must be at least 18 to use Hampas',
      'Be truthful; no harassment or fake events',
      'Report misuse; we may moderate or suspend\u00A0accounts',
      'Event participation is at your own risk; Hampas is a platform, not the\u00A0organizer',
    ],
    termsPath: '/terms',
    privacyPath: '/privacy',
  },
];

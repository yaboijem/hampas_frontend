export type ImageSlide = {
  kind: 'image';
  id: string;
  imageSrc: string;
  title: string;
  body: string;
};

export type PoliciesSlide = {
  kind: 'policies';
  id: string;
  title: string;
  features: string[];
  policies: string[];
  termsPath: '/terms';
  privacyPath: '/privacy';
};

export type OnboardingSlide = ImageSlide | PoliciesSlide;

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    kind: 'image',
    id: 'discover',
    imageSrc: '/courtwball.jpg',
    title: 'Discover and Play',
    body: 'Browse local games and courts. Find events that match your sport and schedule.',
  },
  {
    kind: 'image',
    id: 'friendship',
    imageSrc: '/friendship.jpg',
    title: 'Find Friendship',
    body: 'Meet players nearby, apply to join, and build your crew on and off the court.',
  },
  {
    kind: 'image',
    id: 'enjoy',
    imageSrc: '/enjoy.jpg',
    title: 'Enjoy and have fun',
    body: 'Show up, play hard, stay respectful. Hampas is for good games and good vibes.',
  },
  {
    kind: 'policies',
    id: 'policies',
    title: 'Before you play',
    features: [
      'Discover events near you',
      'Apply to join games',
      'Host events when eligible',
      'Get notifications about your activity',
    ],
    policies: [
      'You must be at least 18 to use Hampas',
      'Be truthful; no harassment or fake events',
      'Report misuse; we may moderate or suspend accounts',
      'Event participation is at your own risk; Hampas is a platform, not the organizer',
    ],
    termsPath: '/terms',
    privacyPath: '/privacy',
  },
];

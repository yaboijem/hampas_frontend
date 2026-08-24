export const REPORT_REASON_LABELS: Record<string, string> = {
  fake_event: 'Fake event',
  fake_organizer: 'Fake organizer',
  inappropriate: 'Inappropriate content',
  spam: 'Spam',
  harassment: 'Harassment',
  other: 'Other',
};

export function reportReasonLabel(reason: string): string {
  return REPORT_REASON_LABELS[reason] ?? reason;
}

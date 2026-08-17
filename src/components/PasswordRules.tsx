import { passwordsMatch } from '../lib/passwordRules';

function Row({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-2 text-xs ${ok ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'text-muted'}`}
    >
      <span aria-hidden>{ok ? '✓' : '○'}</span>
      {children}
    </li>
  );
}

export default function PasswordRules({
  password,
  confirmation,
}: {
  password: string;
  confirmation: string;
}) {
  const len = password.length >= 8;
  const digit = /[0-9]/.test(password);
  const special = /[^A-Za-z0-9]/.test(password);
  const match = passwordsMatch(password, confirmation);

  return (
    <ul className="mt-2 space-y-1" aria-label="Password requirements">
      <Row ok={len}>At least 8 characters</Row>
      <Row ok={digit}>At least 1 digit</Row>
      <Row ok={special}>At least 1 special character</Row>
      <Row ok={match}>Passwords match</Row>
    </ul>
  );
}

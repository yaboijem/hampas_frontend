import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';
import type { Gender } from '../../api/types';

const EIGHTEEN_YEARS_AGO = new Date();
EIGHTEEN_YEARS_AGO.setFullYear(EIGHTEEN_YEARS_AGO.getFullYear() - 18);
const MAX_BIRTH_DATE = EIGHTEEN_YEARS_AGO.toISOString().slice(0, 10);

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    birth_date: '',
    gender: '' as Gender | '',
    privacy_policy_accepted: false,
    terms_accepted: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const isValid =
    form.name.trim() !== '' &&
    form.email.includes('@') &&
    form.password.length >= 8 &&
    form.password === form.password_confirmation &&
    form.birth_date !== '' &&
    form.birth_date <= MAX_BIRTH_DATE &&
    form.gender !== '' &&
    form.privacy_policy_accepted &&
    form.terms_accepted;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const { token, user } = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        birth_date: form.birth_date,
        gender: form.gender as Gender,
        privacy_policy_accepted: form.privacy_policy_accepted,
        terms_accepted: form.terms_accepted,
      });
      signIn(token, user);
      navigate('/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Join Hampas</h1>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <label className="block">
        Name
        <input className="block w-full border p-2" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </label>
      <label className="block">
        Email
        <input type="email" className="block w-full border p-2" value={form.email} onChange={(e) => set('email', e.target.value)} />
      </label>
      <label className="block">
        Password
        <input type="password" className="block w-full border p-2" value={form.password} onChange={(e) => set('password', e.target.value)} />
      </label>
      <label className="block">
        Confirm password
        <input type="password" className="block w-full border p-2" value={form.password_confirmation} onChange={(e) => set('password_confirmation', e.target.value)} />
      </label>
      <label className="block">
        Date of birth
        <input type="date" max={MAX_BIRTH_DATE} className="block w-full border p-2" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
      </label>
      {form.birth_date && form.birth_date > MAX_BIRTH_DATE && (
        <p role="alert" className="text-red-600">You must be at least 18 years old.</p>
      )}
      <label className="block">
        Gender
        <select className="block w-full border p-2" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
          <option value="">Select…</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Prefer not to say</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.privacy_policy_accepted} onChange={(e) => set('privacy_policy_accepted', e.target.checked)} />
        <span>I accept the <Link to="/privacy" className="underline">Privacy Policy</Link></span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.terms_accepted} onChange={(e) => set('terms_accepted', e.target.checked)} />
        <span>I accept the <Link to="/terms" className="underline">Terms of Service</Link></span>
      </label>
      <button type="submit" disabled={!isValid || submitting} className="bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        Create account
      </button>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}

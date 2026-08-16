import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/auth';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await resetPassword(params.get('token') ?? '', email, password, confirmation);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    }
  };

  if (done) {
    return <p className="p-6">Password reset. <Link to="/login" className="underline">Log in</Link></p>;
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Set new password</h1>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <label className="block">
        Email
        <input type="email" className="block w-full border p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block">
        New password
        <input type="password" className="block w-full border p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label className="block">
        Confirm new password
        <input type="password" className="block w-full border p-2" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
      </label>
      <button type="submit" className="bg-blue-700 px-4 py-2 text-white">Reset password</button>
    </form>
  );
}

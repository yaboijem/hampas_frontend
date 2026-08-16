import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    }
  };

  if (sent) {
    return <p className="p-6">If an account exists for that email, a reset link has been sent.</p>;
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Reset password</h1>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <label className="block">
        Email
        <input type="email" className="block w-full border p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button type="submit" className="bg-blue-700 px-4 py-2 text-white">Send reset link</button>
      <p><Link to="/login">Back to login</Link></p>
    </form>
  );
}

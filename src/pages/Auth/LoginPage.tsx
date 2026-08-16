import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { token, user } = await login(email, password);
      signIn(token, user);
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/events';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Log in</h1>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <label className="block">
        Email
        <input type="email" className="block w-full border p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block">
        Password
        <input type="password" className="block w-full border p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button type="submit" className="bg-blue-700 px-4 py-2 text-white">Log in</button>
      <p>
        <Link to="/forgot-password">Forgot password?</Link> · <Link to="/register">Create an account</Link>
      </p>
    </form>
  );
}

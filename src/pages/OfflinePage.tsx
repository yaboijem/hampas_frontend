import { Link } from 'react-router-dom';

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-6 text-center">
      <h1 className="text-2xl font-bold">You're offline</h1>
      <p>Check your connection, then retry.</p>
      <button onClick={() => window.location.reload()} className="border px-4 py-2">Retry</button>
      <p><Link to="/" className="underline">Back to Hampas</Link></p>
    </div>
  );
}

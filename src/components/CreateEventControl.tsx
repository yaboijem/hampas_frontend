import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../api/profiles';
import { isEmailVerified, useAuth } from '../auth/AuthContext';
import { canCreateEvent } from '../auth/canCreateEvent';
import { showToast } from '../lib/adminNotifications';
import CreateEventAccessModal from './CreateEventAccessModal';

type Props = {
  /** Desktop header vs mobile menu styling */
  variant?: 'header' | 'menu';
};

export default function CreateEventControl({ variant = 'header' }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!user) return null;

  const onClick = async () => {
    if (!isEmailVerified(user)) {
      navigate('/verify-email');
      return;
    }
    if (user.is_admin) {
      navigate('/events/new');
      return;
    }
    setChecking(true);
    try {
      const profile = await getProfile();
      if (canCreateEvent(user, profile.roles)) {
        navigate('/events/new');
      } else {
        setShowModal(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not verify hosting access.';
      showToast(msg, 'error');
    } finally {
      setChecking(false);
    }
  };

  const className =
    variant === 'menu'
      ? 'mt-1 block w-full rounded-[var(--radius-control)] bg-cobalt px-3 py-3 text-center text-sm font-semibold text-white hover:bg-electric disabled:opacity-60'
      : 'rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric disabled:opacity-60';

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={checking}
        className={className}
      >
        {checking ? 'Checking…' : 'Create event'}
      </button>
      {showModal ? <CreateEventAccessModal onClose={() => setShowModal(false)} /> : null}
    </>
  );
}

import { useEffect, useState } from 'react';
import { addRole, getProfile, updateRole, type ProfileView } from '../../api/profiles';
import type { ProfileFieldset, Role } from '../../api/types';

const ROLE_FIELDS: Record<Role, { key: keyof ProfileFieldset; label: string; type?: 'text' | 'select'; options?: string[] }[]> = {
  player: [
    { key: 'position', label: 'Position' },
    { key: 'skill_level', label: 'Skill level', type: 'select', options: ['beginner', 'intermediate', 'advanced'] },
  ],
  coach: [
    { key: 'achievements', label: 'Achievements' },
    { key: 'bootcamp_name', label: 'Bootcamp name' },
  ],
  organizer: [{ key: 'managed_courts', label: 'Managed courts' }],
};

const EMPTY: ProfileView = { roles: [], player: null, coach: null, organizer: null };

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileView>(EMPTY);
  const [newRole, setNewRole] = useState<Role>('player');
  const [newFields, setNewFields] = useState<ProfileFieldset>({});
  const [edits, setEdits] = useState<Partial<Record<Role, ProfileFieldset>>>({});
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    getProfile()
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile.'));

  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    setError(null);
    try {
      await addRole(newRole, newFields);
      setNewFields({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add role.');
    }
  };

  const save = async (role: Role) => {
    setError(null);
    try {
      await updateRole(role, edits[role] ?? {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    }
  };

  const currentFields = (role: Role): ProfileFieldset =>
    ({
      player: profile.player,
      coach: profile.coach,
      organizer: profile.organizer,
    })[role] ?? {};

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Your profile</h1>
      {error && <p role="alert" className="text-red-600">{error}</p>}

      <section>
        <h2 className="text-lg font-semibold">Roles</h2>
        <div className="flex gap-2">
          {profile.roles.length === 0 && <span className="text-gray-500">No roles yet.</span>}
          {profile.roles.map((r) => (
            <span key={r} className="rounded bg-blue-100 px-2 py-1 text-sm">{r}</span>
          ))}
        </div>
      </section>

      {!profile.roles.includes(newRole) && (
        <section className="space-y-2 border p-4">
          <h2 className="text-lg font-semibold">Add a role</h2>
          <label className="block">
            Role
            <select aria-label="Add role" className="block w-full border p-2" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
              <option value="player">Player</option>
              <option value="coach">Coach</option>
              <option value="organizer">Organizer</option>
            </select>
          </label>
          {ROLE_FIELDS[newRole].map((field) => (
            <label key={field.key} className="block">
              {field.label}
              {field.type === 'select' ? (
                <select className="block w-full border p-2" value={(newFields[field.key] as string) ?? ''} onChange={(e) => setNewFields((f) => ({ ...f, [field.key]: e.target.value }))}>
                  <option value="">Select…</option>
                  {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="block w-full border p-2" value={(newFields[field.key] as string) ?? ''} onChange={(e) => setNewFields((f) => ({ ...f, [field.key]: e.target.value }))} />
              )}
            </label>
          ))}
          <button onClick={add} className="bg-blue-700 px-4 py-2 text-white">Add role</button>
        </section>
      )}

      {profile.roles.map((role) => (
        <section key={role} className="space-y-2 border p-4">
          <h2 className="text-lg font-semibold capitalize">{role} details</h2>
          {ROLE_FIELDS[role].map((field) => {
            const value = (edits[role]?.[field.key] ?? currentFields(role)[field.key]) as string | undefined;
            return (
              <label key={field.key} className="block">
                {field.label}
                {field.type === 'select' ? (
                  <select className="block w-full border p-2" value={value ?? ''} onChange={(e) => setEdits((ed) => ({ ...ed, [role]: { ...ed[role], [field.key]: e.target.value } }))}>
                    <option value="">Select…</option>
                    {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="block w-full border p-2" value={value ?? ''} onChange={(e) => setEdits((ed) => ({ ...ed, [role]: { ...ed[role], [field.key]: e.target.value } }))} />
                )}
              </label>
            );
          })}
          <button onClick={() => save(role)} className="bg-blue-700 px-4 py-2 text-white">Save {role}</button>
        </section>
      ))}
    </div>
  );
}

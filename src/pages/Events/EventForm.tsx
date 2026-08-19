import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EventItem, EventType, SkillLevel } from '../../api/types';
import BrandMark from '../../components/BrandMark';
import {
  DEFAULT_EVENT_CITY,
  PAMPANGA_CENTER,
  PAMPANGA_CITIES,
  cityCenter,
} from '../../data/pampanga';
import { showToast } from '../../lib/adminNotifications';
import { compressImage } from '../../lib/compressImage';

interface Props {
  initial?: EventItem | null;
  onSubmit: (form: FormData) => Promise<void>;
  submitLabel: string;
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'open_play', label: 'Open play' },
  { value: 'league', label: 'League' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'training_camp', label: 'Training Camp' },
  { value: 'try_out', label: 'Try Out' },
  { value: 'friendly', label: 'Exclusive' },
];

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all_levels', label: 'All levels' },
];

const field =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy shadow-sm outline-none transition placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const label = 'text-xs font-bold uppercase tracking-wide text-chip-text';

function toLocalDatetimeValue(date: Date): string {
  return date.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
}

/** Local `datetime-local` value for start of today (00:00). */
export function minStartsAtLocal(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return toLocalDatetimeValue(d);
}

/** Default create value: next full hour (avoids empty `--:--` browser placeholder). */
export function defaultStartsAtLocal(now = new Date()): string {
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const min = minStartsAtLocal(now);
  const value = toLocalDatetimeValue(d);
  return value < min ? min : value;
}

/** True when value is today or a future local day/time. */
export function isStartsAtAllowed(value: string, now = new Date()): boolean {
  if (!value) return false;
  const selected = new Date(value);
  if (Number.isNaN(selected.getTime())) return false;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return selected.getTime() >= startOfToday.getTime();
}

export default function EventForm({ initial = null, onSubmit, submitLabel }: Props) {
  const toLocal = (iso: string | undefined) =>
    iso ? toLocalDatetimeValue(new Date(iso)) : '';

  const fileRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const typeId = useId();
  const skillId = useId();
  const barangayId = useId();
  const cityId = useId();
  const startsId = useId();
  const photoId = useId();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [eventType, setEventType] = useState<EventType>(initial?.event_type ?? 'open_play');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(initial?.skill_level ?? 'all_levels');
  const [barangay, setBarangay] = useState(initial?.barangay ?? '');
  const [city, setCity] = useState(initial?.city ?? DEFAULT_EVENT_CITY);
  const cityOptions =
    initial?.city && !(PAMPANGA_CITIES as readonly string[]).includes(initial.city)
      ? [initial.city, ...PAMPANGA_CITIES]
      : [...PAMPANGA_CITIES];
  const [startsAt, setStartsAt] = useState(
    () => toLocal(initial?.starts_at) || defaultStartsAtLocal(),
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.photo_url ?? null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [geo, setGeo] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const pickPhoto = async (file: File | null) => {
    if (!file || compressing) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setError(null);
    setCompressing(true);
    try {
      const next = await compressImage(file);
      setRemovePhoto(false);
      setPhoto(next);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      if (message === 'Image must be 5MB or smaller.') {
        setError('Image must be 5MB or smaller.');
      } else if (message === 'Please choose an image file.') {
        setError('Please choose an image file.');
      } else {
        setError('Could not process that image. Try another photo.');
      }
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setCompressing(false);
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
    setPreview(null);
    setRemovePhoto(Boolean(initial?.photo_url));
    if (fileRef.current) fileRef.current.value = '';
  };

  const useMyLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Location not supported.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationError('Could not get location.');
      },
      { timeout: 8000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !startsAt || !city.trim()) {
      setError('Please fill in title, description, city, and start time.');
      return;
    }
    if (!isStartsAtAllowed(startsAt)) {
      setError('Start time must be today or later.');
      return;
    }
    const form = new FormData();
    form.set('title', title.trim());
    form.set('description', description.trim());
    form.set('event_type', eventType);
    form.set('skill_level', skillLevel);
    form.set('barangay', barangay.trim());
    form.set('city', city.trim());
    form.set('starts_at', startsAt);
    const pin = geo
      ? { lat: geo.latitude, lng: geo.longitude }
      : (cityCenter(city) ?? PAMPANGA_CENTER);
    form.set('latitude', String(pin.lat));
    form.set('longitude', String(pin.lng));
    if (photo) form.set('photo', photo);
    else if (removePhoto) form.set('remove_photo', '1');

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(form);
      showToast(initial ? 'Event updated.' : 'Event created.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save event.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
    >
      <div className="relative border-b border-border/70 bg-gradient-to-br from-sky-tint via-surface to-ice px-4 py-3.5 sm:px-5">
        <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-cobalt/10 blur-2xl" aria-hidden />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-chip-text">
              <BrandMark size={14} />
              Host a game
            </p>
            <h1 className="font-display text-xl font-extrabold text-navy">{submitLabel}</h1>
          </div>
          <Link
            to="/events"
            className="rounded-full border border-border bg-surface/90 px-3 py-1.5 text-xs font-semibold text-muted shadow-sm hover:border-cobalt hover:text-navy"
          >
            Cancel
          </Link>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-5">
        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <div className="w-28 shrink-0 sm:w-32" aria-busy={compressing || undefined}>
            <input
              ref={fileRef}
              id={photoId}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Photo"
              onChange={(e) => void pickPhoto(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <div className="relative overflow-hidden rounded-xl border-2 border-sky-tint shadow-sm ring-2 ring-cobalt/10">
                <img src={preview} alt="Event photo preview" className="aspect-square w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-navy/85 to-transparent p-1.5 pt-6">
                  <button
                    type="button"
                    disabled={compressing}
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 rounded-md bg-sky-tint py-0.5 text-[10px] font-bold text-chip-text disabled:opacity-60"
                  >
                    {compressing ? '…' : 'Change'}
                  </button>
                  <button
                    type="button"
                    disabled={compressing}
                    onClick={clearPhoto}
                    className="flex-1 rounded-md bg-white/20 py-0.5 text-[10px] font-bold text-white disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={compressing}
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-cobalt/30 bg-gradient-to-br from-sky-tint to-ice text-center shadow-sm transition hover:border-cobalt hover:shadow-soft disabled:opacity-60"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cobalt text-sm text-white shadow-soft" aria-hidden>
                  📷
                </span>
                <span className="px-1 text-[10px] font-bold text-chip-text">
                  {compressing ? 'Compressing…' : 'Add photo'}
                </span>
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <label htmlFor={titleId} className={label}>
                Title
              </label>
              <input
                id={titleId}
                className={field}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sunday Open Play"
                required
              />
            </div>
            <div>
              <label htmlFor={startsId} className={label}>
                Starts at
              </label>
              <input
                id={startsId}
                type="datetime-local"
                className={field}
                value={startsAt}
                min={minStartsAtLocal()}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor={descriptionId} className={label}>
            Description
          </label>
          <textarea
            id={descriptionId}
            className={`${field} min-h-[72px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Court fee, what to bring…"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-ice/80 p-2.5 ring-1 ring-border/60">
          <div>
            <label htmlFor={typeId} className={label}>
              Event type
            </label>
            <select
              id={typeId}
              className={field}
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={skillId} className={label}>
              Skill level
            </label>
            <select
              id={skillId}
              className={field}
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
            >
              {SKILL_LEVELS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={barangayId} className={label}>
              Barangay
            </label>
            <input
              id={barangayId}
              className={field}
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              placeholder="Malabanias"
            />
          </div>
          <div>
            <label htmlFor={cityId} className={label}>
              City / Municipality
            </label>
            <select
              id={cityId}
              className={field}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            >
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className={[
            'flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 ring-1',
            geo
              ? 'bg-sky-tint/70 ring-cobalt/20'
              : 'bg-gradient-to-r from-ice to-sky-tint/40 ring-border/60',
          ].join(' ')}
        >
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating || submitting}
            className="rounded-lg bg-cobalt px-3 py-1.5 text-xs font-bold text-white shadow-soft hover:bg-electric disabled:opacity-60"
          >
            {locating ? 'Locating…' : geo ? 'Update GPS' : '📍 Use my location'}
          </button>
          {geo && (
            <button
              type="button"
              onClick={() => {
                setGeo(null);
                setLocationError(null);
              }}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-navy"
            >
              Clear
            </button>
          )}
          {geo ? (
            <span className="text-[11px] font-semibold text-chip-text">
              Pin set · {geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)}
            </span>
          ) : (
            <span className="text-[11px] text-muted">Optional · for nearby discovery</span>
          )}
          {locationError && (
            <span role="alert" className="w-full text-[11px] font-medium text-red-600">
              {locationError}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-cobalt to-electric py-2.5 text-sm font-bold text-white shadow-soft transition hover:brightness-105 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

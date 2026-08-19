# Event Photo Client-Side Compression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress event photos in the browser on pick (max edge 1600px, JPEG 0.8) so phone-sized originals can upload under the 5MB cap.

**Architecture:** Pure util `compressImage` in `src/lib/compressImage.ts` with an injectable `deps` seam for jsdom tests. `EventForm.pickPhoto` becomes async: validate type → compress → set photo/preview; show “Compressing…” on the photo control; map errors to fixed copy. No new npm dependencies; multipart field name `photo` unchanged.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Canvas / `createImageBitmap` in the browser.

**Spec:** `docs/superpowers/specs/2026-08-19-event-photo-compress-design.md`

## Global Constraints

- No new npm dependencies
- Output format: `image/jpeg`, quality default `0.8`, max long edge default `1600` (scale down only)
- Size gate applies to **compressed result** only: reject if `> 5 * 1024 * 1024` bytes
- If compressed blob size `>=` original file size, return the **original** `File`
- Exact error copy:
  - Not image: `Please choose an image file.`
  - Over max after compress: `Image must be 5MB or smaller.`
  - Other process failure: `Could not process that image. Try another photo.`
- Compress on pick (not only submit); preview must match the file that will upload
- Stage only files listed in each task commit

## File structure

| Path | Role |
|------|------|
| `src/lib/compressImage.ts` | Pure compress API + injectable deps + dimension helpers |
| `src/test/compressImage.test.ts` | Unit tests for compress behavior |
| `src/pages/Events/EventForm.tsx` | Async pick + compressing UX |
| `src/test/event-form.test.tsx` | Form integration: compress called, photo in FormData, errors |

---

### Task 1: `compressImage` util (TDD)

**Files:**
- Create: `src/lib/compressImage.ts`
- Create: `src/test/compressImage.test.ts`
- Test: `src/test/compressImage.test.ts`

**Interfaces:**
- Consumes: browser APIs via optional deps (tests inject fakes)
- Produces:

```ts
export type CompressImageOptions = {
  maxEdge?: number;   // default 1600
  quality?: number;   // default 0.8
  maxBytes?: number;  // default 5 * 1024 * 1024
};

/** Injectable seams for tests; production uses createImageBitmap + canvas. */
export type CompressImageDeps = {
  decode: (file: Blob) => Promise<{ width: number; height: number; close?: () => void } & object>;
  encodeJpeg: (
    source: object,
    width: number,
    height: number,
    quality: number,
  ) => Promise<Blob | null>;
};

export function scaleDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number };

export function jpegOutputName(originalName: string): string;

export async function compressImage(
  file: File,
  options?: CompressImageOptions,
  deps?: CompressImageDeps,
): Promise<File>;
```

Default `deps` (when omitted):
- `decode`: `createImageBitmap(file)` then return the bitmap (call `close()` after encode if present)
- `encodeJpeg`: draw source onto a canvas of `width`×`height`, `canvas.toBlob('image/jpeg', quality)` as a Promise

Error messages thrown from `compressImage` (message strings used by form mapping):
- Non-image: `Please choose an image file.`
- Null blob / encode failure: `Could not process that image. Try another photo.`
- Over maxBytes: `Image must be 5MB or smaller.`
- Decode failure: wrap as `Could not process that image. Try another photo.`

- [ ] **Step 1: Write failing unit tests**

Create `src/test/compressImage.test.ts`:

```ts
import { describe, expect, test, vi } from 'vitest';
import {
  compressImage,
  jpegOutputName,
  scaleDimensions,
  type CompressImageDeps,
} from '../lib/compressImage';

function fileOf(bytes: number, name = 'shot.png', type = 'image/png'): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function blobOf(bytes: number, type = 'image/jpeg'): Blob {
  return new Blob([new Uint8Array(bytes)], { type });
}

describe('scaleDimensions', () => {
  test('does not upscale when already within maxEdge', () => {
    expect(scaleDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  test('scales landscape so long edge equals maxEdge', () => {
    expect(scaleDimensions(3200, 1800, 1600)).toEqual({ width: 1600, height: 900 });
  });

  test('scales portrait so long edge equals maxEdge', () => {
    expect(scaleDimensions(1200, 2400, 1600)).toEqual({ width: 800, height: 1600 });
  });
});

describe('jpegOutputName', () => {
  test('replaces extension with .jpg', () => {
    expect(jpegOutputName('Court Photo.PNG')).toBe('Court Photo.jpg');
  });

  test('falls back when name is empty', () => {
    expect(jpegOutputName('')).toBe('photo.jpg');
  });
});

describe('compressImage', () => {
  test('rejects non-image files', async () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    await expect(compressImage(file)).rejects.toThrow('Please choose an image file.');
  });

  test('returns original when compressed blob is not smaller', async () => {
    const original = fileOf(1000, 'a.png', 'image/png');
    const deps: CompressImageDeps = {
      decode: vi.fn(async () => ({ width: 100, height: 80 })),
      encodeJpeg: vi.fn(async () => blobOf(1000)),
    };
    const result = await compressImage(original, {}, deps);
    expect(result).toBe(original);
    expect(deps.encodeJpeg).toHaveBeenCalledWith(
      expect.anything(),
      100,
      80,
      0.8,
    );
  });

  test('returns jpeg File when compression shrinks and fits maxBytes', async () => {
    const original = fileOf(5000, 'court.heic', 'image/png');
    const deps: CompressImageDeps = {
      decode: vi.fn(async () => ({ width: 3200, height: 1800 })),
      encodeJpeg: vi.fn(async () => blobOf(1200)),
    };
    const result = await compressImage(
      original,
      { maxEdge: 1600, quality: 0.8, maxBytes: 5 * 1024 * 1024 },
      deps,
    );
    expect(result).not.toBe(original);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('court.jpg');
    expect(result.size).toBe(1200);
    expect(deps.encodeJpeg).toHaveBeenCalledWith(
      expect.anything(),
      1600,
      900,
      0.8,
    );
  });

  test('throws when compressed result exceeds maxBytes', async () => {
    const original = fileOf(10_000, 'huge.png', 'image/png');
    const deps: CompressImageDeps = {
      decode: vi.fn(async () => ({ width: 200, height: 200 })),
      encodeJpeg: vi.fn(async () => blobOf(3000)),
    };
    await expect(
      compressImage(original, { maxBytes: 2000 }, deps),
    ).rejects.toThrow('Image must be 5MB or smaller.');
  });

  test('throws process error when encode returns null', async () => {
    const original = fileOf(500, 'a.png', 'image/png');
    const deps: CompressImageDeps = {
      decode: vi.fn(async () => ({ width: 50, height: 50 })),
      encodeJpeg: vi.fn(async () => null),
    };
    await expect(compressImage(original, {}, deps)).rejects.toThrow(
      'Could not process that image. Try another photo.',
    );
  });

  test('throws process error when decode fails', async () => {
    const original = fileOf(500, 'a.png', 'image/png');
    const deps: CompressImageDeps = {
      decode: vi.fn(async () => {
        throw new Error('decode boom');
      }),
      encodeJpeg: vi.fn(),
    };
    await expect(compressImage(original, {}, deps)).rejects.toThrow(
      'Could not process that image. Try another photo.',
    );
    expect(deps.encodeJpeg).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/test/compressImage.test.ts`

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Implement `src/lib/compressImage.ts`**

```ts
export type CompressImageOptions = {
  maxEdge?: number;
  quality?: number;
  maxBytes?: number;
};

export type CompressImageDeps = {
  decode: (file: Blob) => Promise<{ width: number; height: number; close?: () => void } & object>;
  encodeJpeg: (
    source: object,
    width: number,
    height: number,
    quality: number,
  ) => Promise<Blob | null>;
};

const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_QUALITY = 0.8;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

const ERR_NOT_IMAGE = 'Please choose an image file.';
const ERR_TOO_LARGE = 'Image must be 5MB or smaller.';
const ERR_PROCESS = 'Could not process that image. Try another photo.';

export function scaleDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxEdge || long === 0) {
    return { width, height };
  }
  const scale = maxEdge / long;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export function jpegOutputName(originalName: string): string {
  const base = originalName.trim().replace(/\.[^/.]+$/, '');
  return `${base || 'photo'}.jpg`;
}

function defaultDeps(): CompressImageDeps {
  return {
    async decode(file) {
      return createImageBitmap(file);
    },
    async encodeJpeg(source, width, height, quality) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      });
    },
  };
}

export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
  deps: CompressImageDeps = defaultDeps(),
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error(ERR_NOT_IMAGE);
  }

  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  let bitmap: { width: number; height: number; close?: () => void };
  try {
    bitmap = await deps.decode(file);
  } catch {
    throw new Error(ERR_PROCESS);
  }

  try {
    const { width, height } = scaleDimensions(bitmap.width, bitmap.height, maxEdge);
    let blob: Blob | null;
    try {
      blob = await deps.encodeJpeg(bitmap, width, height, quality);
    } catch {
      throw new Error(ERR_PROCESS);
    }
    if (!blob) {
      throw new Error(ERR_PROCESS);
    }
    if (blob.size >= file.size) {
      return file;
    }
    if (blob.size > maxBytes) {
      throw new Error(ERR_TOO_LARGE);
    }
    return new File([blob], jpegOutputName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close?.();
  }
}
```

Keep implementation minimal and match the tests; adjust only if TypeScript needs a slightly tighter `CanvasImageSource` cast.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- src/test/compressImage.test.ts`

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/compressImage.ts src/test/compressImage.test.ts
git commit -m "feat: add client-side image compression util"
```

---

### Task 2: Wire compression into `EventForm` (TDD)

**Files:**
- Modify: `src/pages/Events/EventForm.tsx`
- Modify: `src/test/event-form.test.tsx`
- Test: `src/test/event-form.test.tsx`

**Interfaces:**
- Consumes: `compressImage(file): Promise<File>` from `../../lib/compressImage`
- Produces: async photo pick; `photo` state is compressed (or original kept by util); UI compressing state

- [ ] **Step 1: Write failing form tests**

In `src/test/event-form.test.tsx`, add mock near other `vi.mock` calls:

```ts
vi.mock('../lib/compressImage', () => ({
  compressImage: vi.fn(async (file: File) => file),
}));
```

Import the mock after imports of EventForm (or use dynamic `import` of the module):

```ts
import * as compressImageMod from '../lib/compressImage';
```

Add a new describe block:

```ts
describe('EventForm photo compression', () => {
  beforeEach(() => {
    vi.mocked(compressImageMod.compressImage).mockReset();
    vi.mocked(compressImageMod.compressImage).mockImplementation(async (file: File) => file);
  });

  test('compresses picked photo and submits compressed file', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const original = new File([new Uint8Array(80)], 'court.png', { type: 'image/png' });
    const compressed = new File([new Uint8Array(40)], 'court.jpg', { type: 'image/jpeg' });
    vi.mocked(compressImageMod.compressImage).mockResolvedValue(compressed);

    render(
      <MemoryRouter>
        <EventForm submitLabel="Create event" onSubmit={onSubmit} />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText(/^photo$/i);
    await user.upload(input, original);

    await waitFor(() => {
      expect(compressImageMod.compressImage).toHaveBeenCalledWith(original);
    });

    await user.type(screen.getByLabelText(/title/i), 'Sunday Open Play');
    await user.type(screen.getByLabelText(/description/i), 'Casual games.');
    await user.selectOptions(screen.getByLabelText(/event type/i), 'open_play');
    await user.selectOptions(screen.getByLabelText(/skill level/i), 'all_levels');
    await user.type(screen.getByLabelText(/barangay/i), 'Malabanias');
    await user.selectOptions(screen.getByLabelText(/city/i), 'Angeles City');
    fireEvent.change(screen.getByLabelText(/starts at/i), {
      target: { value: futureLocal(3, 18) },
    });
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const form = onSubmit.mock.calls[0]?.[0] as FormData;
    expect(form.get('photo')).toBe(compressed);
  });

  test('shows size error when compress rejects oversized result', async () => {
    const user = userEvent.setup();
    vi.mocked(compressImageMod.compressImage).mockRejectedValue(
      new Error('Image must be 5MB or smaller.'),
    );
    const big = new File([new Uint8Array(100)], 'big.png', { type: 'image/png' });

    render(
      <MemoryRouter>
        <EventForm submitLabel="Create event" onSubmit={vi.fn()} />
      </MemoryRouter>,
    );

    await user.upload(screen.getByLabelText(/^photo$/i), big);

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Image must be 5MB or smaller.');
  });

  test('shows process error when compress fails generically', async () => {
    const user = userEvent.setup();
    vi.mocked(compressImageMod.compressImage).mockRejectedValue(new Error('decode boom'));
    const bad = new File([new Uint8Array(20)], 'x.png', { type: 'image/png' });

    render(
      <MemoryRouter>
        <EventForm submitLabel="Create event" onSubmit={vi.fn()} />
      </MemoryRouter>,
    );

    await user.upload(screen.getByLabelText(/^photo$/i), bad);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not process that image. Try another photo.',
    );
  });
});
```

Note: `userEvent.upload` requires the input to not be disabled. If the file input is `sr-only`, it still works via label/aria-label `Photo`.

- [ ] **Step 2: Run form photo tests — expect FAIL**

Run: `npm test -- src/test/event-form.test.tsx`

Expected: FAIL because `pickPhoto` does not call `compressImage` / still rejects large files without compress / error mapping missing.

- [ ] **Step 3: Implement EventForm integration**

In `src/pages/Events/EventForm.tsx`:

1. Import:

```ts
import { compressImage } from '../../lib/compressImage';
```

2. Add state:

```ts
const [compressing, setCompressing] = useState(false);
```

3. Replace `pickPhoto` with:

```ts
  const pickPhoto = async (file: File | null) => {
    if (!file) return;
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
```

4. Remove the old `file.size > 5 * 1024 * 1024` gate (size is enforced inside `compressImage`).

5. Photo UI while compressing:
   - Disable the hidden file input: `disabled={compressing || submitting}`
   - Disable Change / Remove / Add photo buttons when `compressing`
   - When `compressing && !preview`, replace “Add photo” label text with `Compressing…` (or overlay on the dashed button)
   - When `compressing && preview`, show a small overlay or change the Change button label to `…` / keep disabled with `aria-busy={compressing}` on the photo region

Minimal recommended markup for empty state button children when compressing:

```tsx
<span className="px-1 text-[10px] font-bold text-chip-text">
  {compressing ? 'Compressing…' : 'Add photo'}
</span>
```

And on the photo column wrapper:

```tsx
<div className="w-28 shrink-0 sm:w-32" aria-busy={compressing || undefined}>
```

Use a real ellipsis character `…` (U+2026) to match the rest of the app if used elsewhere; otherwise `...` is fine — pick one and stay consistent in tests if asserted.

6. Keep preview `useEffect` unchanged.

- [ ] **Step 4: Run form tests — expect PASS**

Run: `npm test -- src/test/event-form.test.tsx`

Expected: all PASS (including existing create/edit/photo removal tests)

If `user.upload` fails because input is disabled during compress: ensure mock resolves in the same tick so disable is brief, or only disable Change/Add buttons not the file input during tests — prefer disabling buttons + `aria-busy`, leave input enabled but ignore overlapping picks with a simple `if (compressing) return` at the start of `pickPhoto`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Events/EventForm.tsx src/test/event-form.test.tsx
git commit -m "feat: compress event photos on pick"
```

---

### Task 3: Full test suite verification

**Files:**
- None (run only)

- [ ] **Step 1: Run full unit suite**

Run: `npm test`

Expected: all tests PASS

- [ ] **Step 2: Run lint if available**

Run: `npm run lint`

Expected: clean (or only pre-existing issues unrelated to this change)

- [ ] **Step 3: Manual smoke (optional if browser available)**

1. `npm run dev`
2. Open create event form
3. Pick a large phone photo (>5MB if available)
4. Confirm “Compressing…” then preview appears
5. Submit and confirm network payload is JPEG under 5MB

- [ ] **Step 4: No commit unless fixes were needed**

If Task 3 found failures, fix in the owning file and amend only if the commit has not been pushed and the user allows amend; otherwise new fix commits:

```bash
git add <fixed-files>
git commit -m "fix: event photo compression edge cases"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `compressImage` util, canvas, no deps | Task 1 |
| maxEdge 1600, quality 0.8, JPEG | Task 1 |
| Keep original if not smaller | Task 1 |
| Reject if result > 5MB | Task 1 |
| Exact error strings | Task 1 + 2 |
| Compress on pick in EventForm | Task 2 |
| Compressing UX | Task 2 |
| Preview matches upload file | Task 2 (photo state drives preview) |
| FormData `photo` field | Task 2 |
| Unit + form tests | Task 1 + 2 |
| Full suite green | Task 3 |

# Event photo client-side compression

**Date:** 2026-08-19  
**Status:** Approved for planning  
**Scope:** Event create/edit photo pick in `EventForm` + pure util `compressImage`

## Problem

Event photos are uploaded as the original file. Phone cameras often produce 8–15MB images. The form rejects anything over 5MB before upload, so many real photos fail even though a resized JPEG would be fine for cards and detail views. There is no compressor today.

## Goals

- Compress event photos in the browser on pick so typical phone photos succeed.
- Keep uploads under **5MB** after compression.
- Balanced quality: long edge **1600px**, JPEG **quality 0.8**.
- Preview matches the file that will be uploaded.
- No new npm dependencies.

## Non-goals

- Server-side image processing or CDN transforms.
- Compressing images outside event create/edit (profile avatars, etc.).
- Animated GIF / multi-frame handling beyond first-frame decode.
- Exact bit-identical output across browsers.
- Changing backend API contracts (`photo` multipart field stays the same).

## Decisions

| Topic | Choice |
|-------|--------|
| When | Compress on **pick** (not only on submit) |
| Implementation | Pure **canvas** util (`createImageBitmap` preferred, `Image` fallback if needed) |
| Output format | **image/jpeg** |
| Max long edge | **1600px** (scale down only; never upscale) |
| Quality | **0.8** |
| Size rule | Compress first; reject only if **result** still **> 5MB** |
| Already small | If compressed blob is **not smaller** than the original, keep the **original** file |
| Input validation | Still require `file.type` starts with `image/` |
| UX | Short “Compressing…” on the photo control; clear error on failure |

## Architecture

### 1. `src/lib/compressImage.ts`

```ts
export type CompressImageOptions = {
  maxEdge?: number;   // default 1600
  quality?: number;   // default 0.8
  maxBytes?: number;  // default 5 * 1024 * 1024
};

export async function compressImage(
  file: File,
  options?: CompressImageOptions,
): Promise<File>;
```

**Algorithm**

1. Reject non-image types with a thrown `Error` (caller maps to UI message).
2. Decode the file (`createImageBitmap(file)` when available).
3. Compute target width/height: if `max(w,h) > maxEdge`, scale proportionally so long edge = `maxEdge`; else keep dimensions.
4. Draw to an offscreen canvas (or `document.createElement('canvas')`).
5. `canvas.toBlob('image/jpeg', quality)`.
6. If blob is null → throw.
7. If `blob.size >= file.size` → return original `file` (no benefit).
8. If `blob.size > maxBytes` → throw with a clear size message.
9. Else return `new File([blob], baseName + '.jpg', { type: 'image/jpeg', lastModified: Date.now() })`.

**Filename:** strip original extension and use `.jpg` when emitting a new file; preserve a sensible basename (fallback `photo.jpg`).

**Orientation:** rely on browser decode behavior for EXIF orientation where supported; no separate EXIF library.

### 2. `EventForm` integration

Current `pickPhoto` (sync, 5MB gate on original):

- Change to async path on file input `change`.
- Flow:
  1. Validate `image/*`; else set error and return.
  2. Set compressing flag true; clear prior error.
  3. `await compressImage(file)`.
  4. On success: `setPhoto(result)`, `setRemovePhoto(false)`.
  5. On failure: set user-facing error (`Image must be 5MB or smaller after compression.` or generic compress failure).
  6. Always clear compressing flag.
- Existing preview `useEffect` on `photo` stays; preview uses the compressed (or kept) file.
- Disable photo control / show “Compressing…” while in flight; do not block unrelated form fields longer than needed.
- Submit still attaches `photo` as today via `FormData`.

### 3. Error copy

| Case | Message |
|------|---------|
| Not an image | `Please choose an image file.` (unchanged) |
| Still over max after compress | `Image must be 5MB or smaller.` |
| Decode / canvas / other failure | `Could not process that image. Try another photo.` |

## Testing

### Unit (`src/test/compressImage.test.ts`)

- Scales down when long edge exceeds `maxEdge` (mock canvas / bitmap as needed in jsdom).
- Returns original when compression does not reduce size.
- Throws when result exceeds `maxBytes`.
- Rejects non-image input.

jsdom lacks full canvas/image bitmap; tests should inject or mock decode/draw/toBlob boundaries so behavior is asserted without a real GPU. Prefer a small internal seam (e.g. optional deps or testing the pure dimension math + File assembly) over brittle DOM polyfills — implementer chooses the smallest seam that keeps the public API stable.

### Form (`event-form.test.tsx`)

- Mock `compressImage` to assert it is called on photo pick and that the returned `File` is what lands in submit `FormData`.
- Optional: compressing state / error path with a rejected mock.

## Out of scope follow-ups

- Progressive quality loop if still over 5MB after first pass.
- WebP output with JPEG fallback by browser support.
- Shared reuse for future profile photos.

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
    expect(deps.encodeJpeg).toHaveBeenCalledWith(expect.anything(), 100, 80, 0.8);
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
    expect(deps.encodeJpeg).toHaveBeenCalledWith(expect.anything(), 1600, 900, 0.8);
  });

  test('throws when compressed result exceeds maxBytes', async () => {
    const original = fileOf(10_000, 'huge.png', 'image/png');
    const deps: CompressImageDeps = {
      decode: vi.fn(async () => ({ width: 200, height: 200 })),
      encodeJpeg: vi.fn(async () => blobOf(3000)),
    };
    await expect(compressImage(original, { maxBytes: 2000 }, deps)).rejects.toThrow(
      'Image must be 5MB or smaller.',
    );
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

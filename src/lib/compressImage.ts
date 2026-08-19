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

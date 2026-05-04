/**
 * Shrinks large images in the browser before upload so Supabase + the user’s network do less work.
 * No-op for small files or if canvas / decode fails.
 */
export async function shrinkBroadcastImageForUpload(file: File, maxEdge = 2000, maxBytes = 4_800_000): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 380_000) return file;

  let bmp: ImageBitmap | null = null;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height, 1));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bmp, 0, 0, w, h);

    let quality = 0.88;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 7; attempt++) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
      });
      if (!blob) return file;
      if (blob.size <= maxBytes) break;
      quality -= 0.1;
    }
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], 'broadcast.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bmp.close();
  }
}

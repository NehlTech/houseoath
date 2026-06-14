const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function validateImageFile(file: File): Promise<string | null> {
  if (file.size > MAX_SIZE_BYTES) return 'Image must be less than 10 MB.';

  // Read the first 12 bytes for magic-byte detection — spoofing file.type is trivial,
  // magic bytes require modifying the binary content itself.
  const buffer = await file.slice(0, 12).arrayBuffer();
  const b = new Uint8Array(buffer);

  const isJpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  // WebP: "RIFF" at 0-3, then 4 bytes of file size, then "WEBP" at 8-11
  const isWebp =
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;

  if (!isJpeg && !isPng && !isWebp) return 'File must be a JPEG, PNG, or WebP image.';
  return null;
}

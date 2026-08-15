import { put } from '@vercel/blob';

export async function uploadAudio(pathname: string, audio: Buffer) {
  return put(pathname, audio, {
    access: 'public',
    addRandomSuffix: true,
    cacheControlMaxAge: 3600,
    contentType: 'audio/mpeg',
  });
}

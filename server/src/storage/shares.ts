import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface StoredShare {
  extension: 'png' | 'jpg';
  location: string | null;
}

/** Read only the metadata needed by the public share page. */
export async function findStoredShare(id: string): Promise<StoredShare | null> {
  const { env } = getCloudflareContext();
  for (const extension of ['png', 'jpg'] as const) {
    const object = await env.BUCKET.head(`shares/${id}.${extension}`);
    if (object) {
      return {
        extension,
        location: object.customMetadata?.location ?? null,
      };
    }
  }
  return null;
}

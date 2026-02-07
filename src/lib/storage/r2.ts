/**
 * R2 存储工具
 * 封装头像上传、快照瓦片等操作
 */

import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * 上传文件到 R2
 */
export async function uploadToR2(
  key: string,
  data: ReadableStream | ArrayBuffer | string,
  contentType: string
): Promise<string> {
  const { env } = getRequestContext();

  await env.BUCKET.put(key, data, {
    httpMetadata: { contentType },
  });

  // 返回公开 URL（需要在 R2 设置自定义域名或公开访问）
  return `/${key}`;
}

/**
 * 上传用户头像
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png';
  const key = `avatars/${userId}/avatar.${ext}`;

  await uploadToR2(key, file.stream(), file.type);
  return key;
}

/**
 * 从 R2 获取文件
 */
export async function getFromR2(key: string): Promise<R2ObjectBody | null> {
  const { env } = getRequestContext();
  return env.BUCKET.get(key);
}

/**
 * 删除 R2 文件
 */
export async function deleteFromR2(key: string): Promise<void> {
  const { env } = getRequestContext();
  await env.BUCKET.delete(key);
}

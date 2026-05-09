/**
 * Export & Share utilities for iOS.
 *
 * Captures the map + drawing composite view as an image,
 * then offers save/share/upload options.
 */
import { type RefObject } from 'react';
import { Alert, Share, Platform } from 'react-native';
import type ViewShot from 'react-native-view-shot';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';

/**
 * Capture the composite view (map + canvas overlay) as a temp PNG file.
 */
export async function captureView(
  viewShotRef: RefObject<ViewShot | null>
): Promise<string | null> {
  try {
    if (!viewShotRef.current?.capture) return null;
    const uri = await viewShotRef.current.capture();
    return uri;
  } catch (e) {
    console.error('[Export] Capture failed:', e);
    return null;
  }
}

/**
 * Generate a timestamped filename.
 */
export function generateFilename(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `drawmap-${ts}.png`;
}

/**
 * Share the captured image via the native share sheet.
 */
export async function shareImage(uri: string): Promise<void> {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share DrawMap',
      });
    } else {
      // Fallback to React Native Share
      await Share.share({
        url: uri,
      });
    }
  } catch (e) {
    console.error('[Export] Share failed:', e);
  }
}

/**
 * Upload the captured image to the server and get a share link.
 */
export async function uploadShareImage(uri: string): Promise<string | null> {
  try {
    const filename = generateFilename();
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      type: 'image/png',
      name: filename,
    } as unknown as Blob);

    const res = await fetch(`${API_BASE_URL}/api/share`, {
      method: 'POST',
      body: formData,
      headers: {
        // Let fetch set Content-Type with boundary automatically
      },
    });

    if (!res.ok) {
      console.error('[Export] Upload failed:', res.status);
      return null;
    }

    const data = (await res.json()) as { url: string };
    return data.url;
  } catch (e) {
    console.error('[Export] Upload error:', e);
    return null;
  }
}

/**
 * Save the captured image to the app's documents directory.
 */
export async function saveImageLocally(uri: string): Promise<string | null> {
  try {
    const filename = generateFilename();
    const source = new ExpoFile(uri);
    const dest = new ExpoFile(Paths.document, filename);
    source.copy(dest);
    return dest.uri;
  } catch (e) {
    console.error('[Export] Save failed:', e);
    return null;
  }
}

/**
 * Show the export action sheet with all available options.
 */
export function showExportMenu(
  viewShotRef: RefObject<ViewShot | null>,
  lang: 'zh' | 'en' | 'ja'
) {
  const labels = {
    zh: {
      title: '导出地图',
      share: '分享图片',
      link: '生成分享链接',
      save: '保存到本地',
      cancel: '取消',
      capturing: '正在截图...',
      uploading: '正在上传...',
      linkCopied: '分享链接已生成',
      saved: '已保存',
      failed: '操作失败',
    },
    en: {
      title: 'Export Map',
      share: 'Share Image',
      link: 'Generate Share Link',
      save: 'Save Locally',
      cancel: 'Cancel',
      capturing: 'Capturing...',
      uploading: 'Uploading...',
      linkCopied: 'Share link generated',
      saved: 'Saved',
      failed: 'Operation failed',
    },
    ja: {
      title: 'マップをエクスポート',
      share: '画像を共有',
      link: '共有リンクを生成',
      save: 'ローカルに保存',
      cancel: 'キャンセル',
      capturing: 'キャプチャ中...',
      uploading: 'アップロード中...',
      linkCopied: '共有リンクが生成されました',
      saved: '保存しました',
      failed: '操作に失敗しました',
    },
  };

  const l = labels[lang];

  Alert.alert(l.title, undefined, [
    {
      text: l.share,
      onPress: async () => {
        const uri = await captureView(viewShotRef);
        if (uri) {
          await shareImage(uri);
        } else {
          Alert.alert(l.failed);
        }
      },
    },
    {
      text: l.link,
      onPress: async () => {
        const uri = await captureView(viewShotRef);
        if (!uri) { Alert.alert(l.failed); return; }
        const link = await uploadShareImage(uri);
        if (link) {
          Alert.alert(l.linkCopied, link);
        } else {
          Alert.alert(l.failed);
        }
      },
    },
    {
      text: l.save,
      onPress: async () => {
        const uri = await captureView(viewShotRef);
        if (!uri) { Alert.alert(l.failed); return; }
        const path = await saveImageLocally(uri);
        if (path) {
          Alert.alert(l.saved, path);
        } else {
          Alert.alert(l.failed);
        }
      },
    },
    { text: l.cancel, style: 'cancel' },
  ]);
}

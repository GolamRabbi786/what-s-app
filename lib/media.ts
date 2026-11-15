import { Platform } from 'react-native';

export async function fileToDataUri(uri: string, fallbackType: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunk = 0x8000;
      for (let index = 0; index < bytes.length; index += chunk) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
      }
      const base64 = globalThis.btoa(binary);
      return `data:${blob.type || fallbackType};base64,${base64}`;
    }
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    const base64 = await file.base64();
    return `data:${fallbackType};base64,${base64}`;
  } catch {
    return null;
  }
}

export function downloadDataUri(fileName: string, dataUri: string): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    const link = globalThis.document?.createElement?.('a');
    if (!link) return false;
    link.href = dataUri;
    link.download = fileName;
    globalThis.document?.body?.appendChild?.(link);
    link.click();
    link.remove();
    return true;
  } catch {
    return false;
  }
}

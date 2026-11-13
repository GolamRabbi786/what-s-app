import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const BUILD_COMMAND = 'eas build -p android --profile preview';

const CANDIDATES = [
  process.env.APK_PATH,
  'public/downloads/whatsapp.apk',
  'public/downloads/app-release.apk',
  'assets/build/whatsapp.apk',
  'assets/build/app-release.apk',
  'dist/whatsapp.apk',
].filter((value): value is string => Boolean(value));

interface ApkFile {
  absolute: string;
  size: number;
  updatedAt: string;
}

async function locateApk(): Promise<ApkFile | null> {
  for (const candidate of CANDIDATES) {
    const absolute = path.isAbsolute(candidate)
      ? candidate
      : path.join(process.cwd(), candidate);
    try {
      const info = await stat(absolute);
      if (info.isFile() && info.size > 0) {
        return { absolute, size: info.size, updatedAt: info.mtime.toISOString() };
      }
    } catch {
      // Candidate missing — keep looking.
    }
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const externalUrl = process.env.APK_URL?.trim();

  const file = await locateApk();
  const available = Boolean(file || externalUrl);

  if (url.searchParams.has('info')) {
    return Response.json(
      {
        available,
        size: file?.size ?? null,
        updatedAt: file?.updatedAt ?? null,
        url: externalUrl ?? (file ? '/api/download/apk' : null),
        buildCommand: BUILD_COMMAND,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (externalUrl) {
    return Response.redirect(externalUrl, 302);
  }

  if (!file) {
    return Response.json(
      {
        error: 'The Android APK has not been built for this deployment yet.',
        buildCommand: BUILD_COMMAND,
      },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const data = await readFile(file.absolute);
  const body = new Uint8Array(data);

  return new Response(body, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="whatsapp-web.apk"',
      'Content-Length': String(file.size),
      'Cache-Control': 'public, max-age=300',
    },
  });
}

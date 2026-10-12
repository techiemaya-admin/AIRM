/**
 * Task-board attachments sit in a private bucket behind /api/fjt-board/media/,
 * which needs sign-in. <img src> and <a href> can't send the bearer token, so
 * each attachment URL is given a short-lived signature from /media/sign first.
 * Requests made in the same tick are batched into one call.
 */

import { useEffect, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const MEDIA_PREFIX = `${API_BASE}/api/fjt-board/media/`;
const REFRESH_BEFORE_MS = 5 * 60 * 1000;
const MAX_PER_REQUEST = 200;

type Signature = { exp: number; sig: string };

const signatures = new Map<string, Signature>();
let pending: Map<string, Array<(s: Signature | null) => void>> | null = null;

// The object name of a media proxy URL (as resolveLocalAsset builds them), else null.
function taskBoardMediaName(url?: string): string | null {
  if (!url || !url.startsWith(MEDIA_PREFIX)) return null;
  const path = url.slice(MEDIA_PREFIX.length).split(/[?#]/)[0];
  try {
    const name = decodeURIComponent(path);
    return name.startsWith('task-board/') ? name : null;
  } catch {
    return null;
  }
}

const fresh = (s?: Signature) => (s && s.exp * 1000 - Date.now() > REFRESH_BEFORE_MS ? s : undefined);

const withSignature = (url: string, s: Signature) =>
  `${url.split(/[?#]/)[0]}?exp=${s.exp}&sig=${encodeURIComponent(s.sig)}`;

async function flush() {
  const batch = pending!;
  pending = null;
  const names = [...batch.keys()];
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
  const signed: Record<string, Signature> = {};

  await Promise.all(
    Array.from({ length: Math.ceil(names.length / MAX_PER_REQUEST) }, async (_, i) => {
      try {
        const resp = await fetch(`${API_BASE}/api/fjt-board/media/sign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ names: names.slice(i * MAX_PER_REQUEST, (i + 1) * MAX_PER_REQUEST) }),
        });
        if (resp.ok) Object.assign(signed, (await resp.json()).data);
      } catch {
        // Left unsigned: the image shows as broken rather than breaking the page.
      }
    })
  );

  batch.forEach((resolvers, name) => {
    const s = signed[name] ?? null;
    if (s) signatures.set(name, s);
    resolvers.forEach((resolve) => resolve(s));
  });
}

function requestSignature(name: string): Promise<Signature | null> {
  const cached = fresh(signatures.get(name));
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    if (!pending) {
      pending = new Map();
      setTimeout(flush, 0);
    }
    pending.set(name, [...(pending.get(name) ?? []), resolve]);
  });
}

/**
 * `src` with a signature when it is a task-board media URL, kept fresh while
 * mounted; any other URL comes back unchanged. Undefined while signing.
 */
export function useSignedMediaUrl(src?: string): string | undefined {
  const name = taskBoardMediaName(src);
  const [signed, setSigned] = useState<{ name: string; url: string } | null>(null);
  const [renewals, setRenewals] = useState(0);

  useEffect(() => {
    if (!name) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    requestSignature(name).then((s) => {
      if (!live) return;
      setSigned({ name, url: s ? withSignature(src!, s) : src! });
      if (s) timer = setTimeout(() => setRenewals((n) => n + 1), s.exp * 1000 - Date.now() - REFRESH_BEFORE_MS);
    });
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [name, src, renewals]);

  if (!name) return src;
  if (signed?.name === name) return signed.url;
  const cached = fresh(signatures.get(name));
  return cached ? withSignature(src!, cached) : undefined;
}

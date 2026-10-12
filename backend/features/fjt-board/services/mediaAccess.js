import crypto from 'crypto';

/**
 * Task-board attachments live in a private bucket, and the board renders them
 * with plain <img src> / <a href>, which cannot carry the bearer token. So a
 * signed-in user asks POST /media/sign for short-lived links instead: each is
 * an HMAC over one object name and an expiry, so a copied link opens that one
 * file until it expires and nothing else.
 */

const PREFIX = 'task-board/';
const WINDOW_SECONDS = 60 * 60;

/**
 * The object name if `raw` is a task-board attachment, else null. Only a single
 * name directly under task-board/ is allowed (what uploadAttachment writes): the
 * bucket also holds profile documents, which this route must never reach.
 */
export function taskBoardObjectName(raw) {
  const name = String(raw || '').replace(/^\/+/, '');
  if (!name.startsWith(PREFIX)) return null;
  const file = name.slice(PREFIX.length);
  return /^[A-Za-z0-9][^/\\\u0000-\u001f\u007f]*$/.test(file) ? name : null;
}

// Keyed off JWT_SECRET (required at boot) under its own label, so no new secret
// has to be deployed and the media key is never the JWT signing key itself.
function hmac(value) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required to sign media links');
  const key = crypto.createHmac('sha256', process.env.JWT_SECRET).update('fjt-board-media-v1').digest();
  return crypto.createHmac('sha256', key).update(value).digest('base64url');
}

/**
 * Expiry is rounded up to the hour, so an image keeps the same URL (and stays in
 * the browser cache) for at least an hour and at most two.
 */
export function signMediaName(name, now = Date.now()) {
  const exp = (Math.floor(now / 1000 / WINDOW_SECONDS) + 2) * WINDOW_SECONDS;
  return { exp, sig: hmac(`${name}\n${exp}`) };
}

export function verifyMediaSignature(name, exp, sig, now = Date.now()) {
  const expiry = Number(exp);
  if (!name || !Number.isInteger(expiry) || expiry * 1000 <= now || typeof sig !== 'string') {
    return false;
  }
  const expected = Buffer.from(hmac(`${name}\n${expiry}`));
  const given = Buffer.from(sig);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

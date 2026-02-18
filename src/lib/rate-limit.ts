/**
 * Rate limit por IP en memoria. Limpieza del Map cada 60 s.
 * Para producción a gran escala considerar Redis.
 * Límites: login 10/15min, booking 20/min (crear/cancelar usuario), checkout 5/min, webhook 20/min, admin 10/min.
 */
const store = new Map<string, { count: number; resetAt: number }>();

const LIMITS = {
  login: { max: 10, windowMs: 15 * 60_000 },
  booking: { max: 20, windowMs: 60_000 },
  checkout: { max: 5, windowMs: 60_000 },
  webhook: { max: 20, windowMs: 60_000 },
  admin: { max: 10, windowMs: 60_000 },
} as const;

const CLEANUP_INTERVAL_MS = 60_000;

function getKey(route: keyof typeof LIMITS, ip: string): string {
  return `${route}:${ip}`;
}

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanupTimer(): void {
  if (cleanupTimer === null && typeof setInterval !== 'undefined') {
    cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
  }
}

export function checkRateLimit(
  route: keyof typeof LIMITS,
  ip: string
): boolean {
  ensureCleanupTimer();
  const now = Date.now();
  const { max, windowMs } = LIMITS[route];
  const key = getKey(route, ip);
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) {
    return false;
  }

  entry.count += 1;
  return true;
}

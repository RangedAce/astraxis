type Session = {
  accessToken: string;
  refreshToken: string;
  playerId: string;
  planetId?: string;
};

const STORAGE_KEY = 'astraxis_auth';

export function saveSession(session: Session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch (e) {
    return null;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function updateTokens(tokens: Partial<Pick<Session, 'accessToken' | 'refreshToken'>>) {
  if (typeof window === 'undefined') return;
  const current = loadSession();
  if (!current) return;
  saveSession({ ...current, ...tokens });
}

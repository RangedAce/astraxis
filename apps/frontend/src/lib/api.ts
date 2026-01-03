import { loadSession, saveSession, updateTokens, clearSession } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<any> {
  const session = loadSession();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  if (res.status === 401 && session?.refreshToken && retry) {
    const refreshed = await refreshToken(session.refreshToken);
    if (refreshed) {
      updateTokens(refreshed);
      return apiFetch(path, options, false);
    }
    clearSession();
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  const session = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    playerId: data.player.id,
    planetId: data.player.planets?.[0]?.id
  };
  saveSession(session);
  return data;
}

export async function register(email: string, password: string, nickname: string) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname })
  });
  const session = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    playerId: data.player.id,
    planetId: data.planet?.id
  };
  saveSession(session);
  return data;
}

export async function refreshToken(refreshTokenValue: string) {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenValue })
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

export async function fetchOverview(universeId: string, planetId: string) {
  return apiFetch(`/universe/${universeId}/planet/${planetId}/overview`);
}

export async function startBuilding(planetId: string, buildingKey: string) {
  return apiFetch(`/planet/${planetId}/buildings/start`, {
    method: 'POST',
    body: JSON.stringify({ buildingKey })
  });
}

export async function startResearch(techKey: string, planetId?: string) {
  return apiFetch('/player/research/start', {
    method: 'POST',
    body: JSON.stringify({ techKey, planetId })
  });
}

export async function startShips(planetId: string, shipKey: string, qty: number) {
  return apiFetch(`/planet/${planetId}/ships/start`, {
    method: 'POST',
    body: JSON.stringify({ shipKey, qty })
  });
}

export function getApiBase() {
  return API_BASE;
}

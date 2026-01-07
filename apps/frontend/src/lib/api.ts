import { loadSession, saveSession, updateTokens, clearSession } from './auth';

function getRuntimeApiBase() {
  if (typeof window === 'undefined') return null;
  const runtime = (window as any).__ENV__?.NEXT_PUBLIC_API_URL;
  return typeof runtime === 'string' && runtime.length > 0 ? runtime : null;
}

const FALLBACK_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function resolveApiBase() {
  const runtime = getRuntimeApiBase();
  if (runtime) return runtime;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${host}:3001/api`;
  }
  return FALLBACK_API_BASE;
}

function normalizeApiMessage(message: unknown) {
  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === 'string').join(', ');
  }
  if (typeof message === 'string') {
    return message;
  }
  return null;
}

function friendlyErrorMessage(raw: string | null) {
  if (!raw) return 'Une erreur est survenue.';
  const map: Record<string, string> = {
    'Not enough resources': 'Ressources insuffisantes.',
    'Planet not owned': 'Planete introuvable.',
    'Planet not found or not yours': 'Planete introuvable.',
    'Invalid credentials': 'Identifiants invalides.',
    'Email already registered': 'Cet email est deja utilise.',
    Unauthorized: 'Acces refuse.'
  };
  return map[raw] ?? raw;
}

async function parseErrorMessage(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await res.json();
      const message = normalizeApiMessage(data?.message) || normalizeApiMessage(data?.error);
      return friendlyErrorMessage(message);
    } catch {
      return friendlyErrorMessage(null);
    }
  }
  try {
    const text = await res.text();
    if (!text) return friendlyErrorMessage(null);
    try {
      const data = JSON.parse(text);
      const message = normalizeApiMessage(data?.message) || normalizeApiMessage(data?.error);
      return friendlyErrorMessage(message || text);
    } catch {
      return friendlyErrorMessage(text);
    }
  } catch {
    return friendlyErrorMessage(null);
  }
}

async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<any> {
  const session = loadSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  const res = await fetch(`${resolveApiBase()}${path}`, {
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
    const message = await parseErrorMessage(res);
    throw new Error(message || 'Request failed');
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

export async function registerWithUniverse(
  email: string,
  password: string,
  nickname: string,
  universeId?: string
) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname, universeId })
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
    const res = await fetch(`${resolveApiBase()}/auth/refresh`, {
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

export async function fetchUniverses() {
  return apiFetch('/universes');
}

export async function createUniverse(payload: {
  name: string;
  speedFleet: number;
  speedBuild: number;
  speedResearch: number;
  speedProduction: number;
  maxSystems: number;
  maxPositions: number;
  isPeacefulDefault: boolean;
  adminToken: string;
}) {
  const { adminToken, ...body } = payload;
  return apiFetch('/universes', {
    method: 'POST',
    headers: { 'x-admin-token': adminToken },
    body: JSON.stringify(body)
  });
}

export async function updateUniverse(
  id: string,
  payload: {
    name?: string;
    speedFleet?: number;
    speedBuild?: number;
    speedResearch?: number;
    speedProduction?: number;
    maxSystems?: number;
    maxPositions?: number;
    isPeacefulDefault?: boolean;
    adminToken: string;
  }
) {
  const { adminToken, ...body } = payload;
  return apiFetch(`/universes/${id}`, {
    method: 'PUT',
    headers: { 'x-admin-token': adminToken },
    body: JSON.stringify(body)
  });
}

export async function fetchProfile() {
  return apiFetch('/auth/me');
}

export async function updateProfile(payload: { email?: string; password?: string }) {
  return apiFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
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

export async function updateProductionFactor(
  planetId: string,
  buildingKey: string,
  factor: number
) {
  return apiFetch(`/planet/${planetId}/production`, {
    method: 'POST',
    body: JSON.stringify({ buildingKey, factor })
  });
}

export function getApiBase() {
  return resolveApiBase();
}

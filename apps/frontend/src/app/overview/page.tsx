'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BuildingKey,
  ResearchKey,
  ShipKey,
  BUILDING_LIST,
  RESEARCH_LIST,
  SHIP_LIST
} from '@astraxis/shared';
import io, { Socket } from 'socket.io-client';
import {
    fetchOverview,
    getApiBase,
    startBuilding,
    startResearch,
    startShips
} from '../../lib/api';
import { clearSession, loadSession } from '../../lib/auth';

type QueueItem = {
  id: string;
  type: string;
  key: string;
  levelOrQty: number;
  endAt: string;
};

const buildingLabels: Record<string, string> = {
  [BuildingKey.MetalMine]: 'Mine métal',
  [BuildingKey.CrystalMine]: 'Mine cristal',
  [BuildingKey.DeuteriumSynthesizer]: 'Synthé deut',
  [BuildingKey.SolarPlant]: 'Centrale solaire',
  [BuildingKey.RoboticsFactory]: 'Usine robots',
  [BuildingKey.Shipyard]: 'Chantier spatial',
  [BuildingKey.ResearchLab]: 'Laboratoire'
};

const researchLabels: Record<string, string> = {
  [ResearchKey.Energy]: 'Energie',
  [ResearchKey.Laser]: 'Laser',
  [ResearchKey.Ion]: 'Ions',
  [ResearchKey.Hyperspace]: 'Hyperspace',
  [ResearchKey.CombustionDrive]: 'Combustion',
  [ResearchKey.ImpulseDrive]: 'Impulsion',
  [ResearchKey.Hyperdrive]: 'Hyperespace',
  [ResearchKey.Espionage]: 'Espionnage'
};

const shipLabels: Record<string, string> = {
  [ShipKey.SmallCargo]: 'Petit transporteur',
  [ShipKey.LargeCargo]: 'Grand transporteur',
  [ShipKey.LightFighter]: 'Chasseur léger',
  [ShipKey.Probe]: 'Sonde'
};

export default function OverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<any>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [resources, setResources] = useState({ metal: 0, crystal: 0, deut: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShip, setSelectedShip] = useState<ShipKey>(ShipKey.SmallCargo);
  const [shipQty, setShipQty] = useState(1);
  const [selectedResearch, setSelectedResearch] = useState<ResearchKey>(ResearchKey.Energy);
  const [socket, setSocket] = useState<Socket | null>(null);

  const universeId = searchParams.get('universe');
  const planetId = searchParams.get('planet') || loadSession()?.planetId || '';

  const buildingsMap = useMemo(() => {
    const map: Record<string, number> = {};
    overview?.buildings?.forEach((b: any) => {
      map[b.buildingKey] = b.level;
    });
    return map;
  }, [overview]);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.push('/login');
      return;
    }
    if (!universeId || !planetId) {
      router.push('/');
      return;
    }
    const url = getApiBase().replace('/api', '');
    const s = io(`${url}/socket`, {
      transports: ['websocket'],
      auth: { token: session.accessToken }
    });
    s.on('connect', () => {
      s.emit('subscribe', { playerId: session.playerId });
    });
    s.on('resources:update', (payload: any) => {
      if (payload.planetId === planetId) {
        setResources((prev) => ({
          metal: payload.metal ?? prev.metal,
          crystal: payload.crystal ?? prev.crystal,
          deut: payload.deut ?? prev.deut
        }));
      }
    });
    s.on('queue:update', (payload: any) => {
      setQueue(payload.items || []);
    });
    s.on('queue:finished', () => {
      reload();
    });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [universeId, planetId]);

  async function reload() {
    const session = loadSession();
    if (!session || !universeId || !planetId) return;
    try {
      setLoading(true);
      const data = await fetchOverview(universeId, planetId);
      setOverview(data);
      setQueue(data.queue);
      setResources({
        metal: data.resources.metal,
        crystal: data.resources.crystal,
        deut: data.resources.deuterium
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, [universeId, planetId]);

  async function handleBuilding(key: BuildingKey) {
    if (!planetId) return;
    setError(null);
    try {
      await startBuilding(planetId, key);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Impossible de lancer la construction');
    }
  }

  async function handleResearch() {
    setError(null);
    try {
      await startResearch(selectedResearch, planetId);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Impossible de lancer la recherche');
    }
  }

  async function handleShips() {
    if (!planetId) return;
    setError(null);
    try {
      await startShips(planetId, selectedShip, shipQty);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Impossible de lancer la production');
    }
  }

  function logout() {
    clearSession();
    router.push('/login');
  }

  return (
    <div className="grid">
      <div className="title-bar">
        <h2>Vue d&apos;ensemble</h2>
        <button className="btn" onClick={logout}>
          Déconnexion
        </button>
      </div>
      {error && <div className="danger">{error}</div>}
      {loading && <div className="muted">Chargement...</div>}
      {overview && (
        <>
          <div className="panel">
            <div className="title-bar">
              <h2>{overview.planet.name}</h2>
              <div className="pill">
                G:{overview.planet.galaxy} S:{overview.planet.system} P:
                {overview.planet.position}
              </div>
            </div>
            <div className="grid two" style={{ marginTop: 10 }}>
              <div className="card">
                <div className="muted">Métal</div>
                <div className="brand" style={{ fontSize: 20 }}>{Math.floor(resources.metal)}</div>
                <div className="muted">
                  +{Math.round(overview.production.metalPerHour)}/h
                </div>
              </div>
              <div className="card">
                <div className="muted">Cristal</div>
                <div className="brand" style={{ fontSize: 20 }}>
                  {Math.floor(resources.crystal)}
                </div>
                <div className="muted">
                  +{Math.round(overview.production.crystalPerHour)}/h
                </div>
              </div>
              <div className="card">
                <div className="muted">Deutérium</div>
                <div className="brand" style={{ fontSize: 20 }}>{Math.floor(resources.deut)}</div>
                <div className="muted">+{Math.round(overview.production.deutPerHour)}/h</div>
              </div>
              <div className="card">
                <div className="muted">Energie</div>
                <div className="brand" style={{ fontSize: 20 }}>
                  {overview.production.energy}
                </div>
              </div>
            </div>
          </div>

          <div className="grid two">
            <div className="panel">
              <div className="title-bar">
                <h2>Bâtiments</h2>
                <button className="btn" onClick={reload}>
                  Rafraîchir
                </button>
              </div>
              <div className="list" style={{ marginTop: 10 }}>
                {BUILDING_LIST.map((key) => (
                  <div key={key} className="card row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div>{buildingLabels[key] ?? key}</div>
                      <div className="muted">Niveau {buildingsMap[key] ?? 0}</div>
                    </div>
                    <button className="btn primary" onClick={() => handleBuilding(key)}>
                      +1
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <h2>Recherches</h2>
              <div className="stack">
                <select
                  className="input"
                  value={selectedResearch}
                  onChange={(e) => setSelectedResearch(e.target.value as ResearchKey)}
                >
                  {RESEARCH_LIST.map((key) => (
                    <option key={key} value={key}>
                      {researchLabels[key] ?? key}
                    </option>
                  ))}
                </select>
                <button className="btn primary" onClick={handleResearch}>
                  Lancer
                </button>
              </div>

              <h2 style={{ marginTop: 20 }}>Vaisseaux</h2>
              <div className="stack">
                <select
                  className="input"
                  value={selectedShip}
                  onChange={(e) => setSelectedShip(e.target.value as ShipKey)}
                >
                  {SHIP_LIST.map((key) => (
                    <option key={key} value={key}>
                      {shipLabels[key] ?? key}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={shipQty}
                  onChange={(e) => setShipQty(parseInt(e.target.value, 10))}
                />
                <button className="btn primary" onClick={handleShips}>
                  Construire
                </button>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="title-bar">
              <h2>File d&apos;attente</h2>
              <div className="muted">Temps réel</div>
            </div>
            <div className="list" style={{ marginTop: 10 }}>
              {queue.length === 0 && <div className="muted">Aucun élément en cours.</div>}
              {queue.map((item) => {
                const end = new Date(item.endAt);
                const remaining = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
                return (
                  <div key={item.id} className="card row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div>
                        {item.type} - {item.key}
                      </div>
                      <div className="muted">
                        Niveau/Qté: {item.levelOrQty} · Fin {end.toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="pill">{remaining}s</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

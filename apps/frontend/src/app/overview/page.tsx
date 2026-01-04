'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import {
  BUILDING_KEYS,
  BUILDING_META,
  BuildingCategory,
  BuildingKey,
  RESEARCH_KEYS,
  RESEARCH_META,
  ResearchKey,
  SHIP_KEYS,
  SHIP_META,
  ShipKey,
  calculateResearchCost,
  calculateResearchTimeSeconds,
  calculateShipBuildTimeSeconds,
  calculateShipCost,
  getPositionModifiers,
  positionToTemperature
} from '@astraxis/shared';
import {
  fetchOverview,
  getApiBase,
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

type TabKey = 'constructions' | 'installations' | 'research' | 'shipyard' | 'galaxy';

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatNumber(value: number) {
  return Math.floor(value).toLocaleString('fr-FR');
}

export default function OverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<any>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [resources, setResources] = useState({ metal: 0, crystal: 0, deut: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('constructions');
  const [selectedResearch, setSelectedResearch] = useState<ResearchKey>(ResearchKey.Energy);
  const [selectedShip, setSelectedShip] = useState<ShipKey>(ShipKey.SmallCargo);
  const [shipQty, setShipQty] = useState(1);
  const [now, setNow] = useState(Date.now());

  const universeId = searchParams.get('universe');
  const planetId = searchParams.get('planet') || loadSession()?.planetId || '';

  const buildingsMap = useMemo(() => {
    const map: Record<string, number> = {};
    overview?.buildings?.forEach((b: any) => {
      map[b.buildingKey] = b.level;
    });
    return map;
  }, [overview]);

  const researchMap = useMemo(() => {
    const map: Record<string, number> = {};
    overview?.researchLevels?.forEach((r: any) => {
      map[r.techKey] = r.level;
    });
    return map;
  }, [overview]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const reload = useCallback(async () => {
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
  }, [planetId, universeId]);

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
    return () => {
      s.disconnect();
    };
  }, [router, universeId, planetId, reload]);

  useEffect(() => {
    reload();
  }, [universeId, planetId, reload]);

  async function handleResearch(key: ResearchKey) {
    setError(null);
    try {
      await startResearch(key, planetId);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Impossible de lancer la recherche');
    }
  }

  async function handleShips(key: ShipKey) {
    if (!planetId) return;
    setError(null);
    try {
      await startShips(planetId, key, shipQty);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Impossible de lancer la production');
    }
  }

  function logout() {
    clearSession();
    router.push('/login');
  }

  if (loading && !overview) {
    return <div className="muted">Chargement...</div>;
  }

  const planet = overview?.planet;
  const universe = planet?.universe;
  const position = planet?.position ?? 1;
  const storage = overview?.storage ?? { metal: 0, crystal: 0, deuterium: 0 };
  const energyProduced = overview?.production?.energyProduced ?? 0;
  const energyUsed = overview?.production?.energyUsed ?? 0;
  const { energyModifier, deutModifier } = getPositionModifiers(position);
  const energyBonus = Math.round((energyModifier - 1) * 100);
  const deutBonus = Math.round((deutModifier - 1) * 100);
  const temp = planet?.temperature ?? positionToTemperature(position);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'constructions', label: 'Constructions' },
    { key: 'installations', label: 'Installations' },
    { key: 'research', label: 'Recherches' },
    { key: 'shipyard', label: 'Chantier spatial' },
    { key: 'galaxy', label: 'Galaxie' }
  ];

  function renderBuildingList(category: BuildingCategory) {
    return BUILDING_KEYS.filter((key) => BUILDING_META[key].category === category).map((key) => {
      const level = buildingsMap[key] ?? 0;
      const meta = BUILDING_META[key];
      const factor = overview?.productionFactors?.[key] ?? 100;
      const storage =
        key === BuildingKey.MetalStorage
          ? overview?.storage?.metal
          : key === BuildingKey.CrystalStorage
            ? overview?.storage?.crystal
            : key === BuildingKey.DeuteriumTank
              ? overview?.storage?.deuterium
              : null;
      const detailHref = `/buildings/${key}?planet=${planetId}&universe=${universeId}`;
      return (
        <div key={key} className="card row between">
          <div className="row gap">
            {meta.imageUrl ? (
              <img src={meta.imageUrl} alt={meta.label} className="icon" />
            ) : (
              <div className="icon placeholder" />
            )}
            <div>
              <div>{meta.label}</div>
              <div className="muted">Niveau {level}</div>
              {storage !== null && (
                <div className="muted">Cap: {formatNumber(storage)}</div>
              )}
              {storage === null &&
                (key === BuildingKey.MetalMine ||
                  key === BuildingKey.CrystalMine ||
                  key === BuildingKey.DeuteriumSynthesizer) && (
                  <div className="muted">Prod: {factor}%</div>
                )}
            </div>
          </div>
          <div className="row gap">
            <Link className="btn primary" href={detailHref}>
              Ameliorer
            </Link>
          </div>
        </div>
      );
    });
  }

  function renderResearchList() {
    return RESEARCH_KEYS.map((key) => {
      const level = researchMap[key] ?? 0;
      const meta = RESEARCH_META[key];
      return (
        <div key={key} className="card row between">
          <div className="row gap">
            {meta.imageUrl ? (
              <img src={meta.imageUrl} alt={meta.label} className="icon" />
            ) : (
              <div className="icon placeholder" />
            )}
            <div>
              <div>{meta.label}</div>
              <div className="muted">Niveau {level}</div>
            </div>
          </div>
          <div className="row gap">
            <button className="btn" onClick={() => setSelectedResearch(key)}>
              Details
            </button>
            <button className="btn primary" onClick={() => handleResearch(key)}>
              Lancer
            </button>
          </div>
        </div>
      );
    });
  }

  function renderResearchDetails() {
    if (!planet || !universe) return null;
    const level = researchMap[selectedResearch] ?? 0;
    const nextLevel = level + 1;
    const cost = calculateResearchCost(selectedResearch, nextLevel);
    const labLevel = buildingsMap[BuildingKey.ResearchLab] ?? 0;
    const duration = calculateResearchTimeSeconds(
      selectedResearch,
      nextLevel,
      universe.speedResearch,
      labLevel
    );
    const meta = RESEARCH_META[selectedResearch];
    return (
      <div className="panel">
        <div className="title-bar">
          <h2>{meta.label}</h2>
        </div>
        <div className="muted">{meta.description}</div>
        <div className="grid two" style={{ marginTop: 12 }}>
          <div className="card">
            <div className="muted">Cout niveau {nextLevel}</div>
            <div>Metal: {formatNumber(cost.metal)}</div>
            <div>Cristal: {formatNumber(cost.crystal)}</div>
            <div>Deut: {formatNumber(cost.deuterium)}</div>
          </div>
          <div className="card">
            <div className="muted">Temps</div>
            <div>{formatDuration(duration)}</div>
          </div>
        </div>
      </div>
    );
  }

  function renderShipyard() {
    const shipyardLevel = buildingsMap[BuildingKey.Shipyard] ?? 0;
    const roboticsLevel = buildingsMap[BuildingKey.RoboticsFactory] ?? 0;
    const cost = calculateShipCost(selectedShip, shipQty);
    const duration = universe
      ? calculateShipBuildTimeSeconds(
          selectedShip,
          shipQty,
          universe.speedBuild,
          shipyardLevel,
          roboticsLevel
        )
      : 0;
    return (
      <>
        <div className="panel">
          <h2>Chantier spatial</h2>
          <div className="stack">
            <select
              className="input"
              value={selectedShip}
              onChange={(e) => setSelectedShip(e.target.value as ShipKey)}
            >
              {SHIP_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SHIP_META[key].label}
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
            <div className="card">
              <div className="muted">Cout</div>
              <div>Metal: {formatNumber(cost.metal)}</div>
              <div>Cristal: {formatNumber(cost.crystal)}</div>
              <div>Deut: {formatNumber(cost.deuterium)}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Temps: {formatDuration(duration)}
              </div>
            </div>
            <button className="btn primary" onClick={() => handleShips(selectedShip)}>
              Construire
            </button>
          </div>
        </div>
        <div className="panel">
          <h2>Catalogue</h2>
          <div className="list">
            {SHIP_KEYS.map((key) => (
              <div key={key} className="card row between">
                <div className="row gap">
                  {SHIP_META[key].imageUrl ? (
                    <img src={SHIP_META[key].imageUrl} alt={SHIP_META[key].label} className="icon" />
                  ) : (
                    <div className="icon placeholder" />
                  )}
                  <div>
                    <div>{SHIP_META[key].label}</div>
                    <div className="muted">{SHIP_META[key].description}</div>
                  </div>
                </div>
                <button className="btn" onClick={() => setSelectedShip(key)}>
                  Selectionner
                </button>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="grid">
      <div className="title-bar">
        <h2>Vue d ensemble</h2>
        <div className="row gap">
          {universe && <div className="pill">{universe.name}</div>}
          <button className="btn" onClick={logout}>
            Deconnexion
          </button>
        </div>
      </div>

      {error && <div className="danger">{error}</div>}

      {planet && (
        <div className="panel">
          <div className="title-bar">
            <h2>{planet.name}</h2>
            <div className="pill">
              G:{planet.galaxy} S:{planet.system} P:{planet.position}
            </div>
          </div>
          <div className="grid two" style={{ marginTop: 10 }}>
            <div className="card">
              <div className="muted">Metal</div>
              <div className="brand" style={{ fontSize: 20 }}>
                {formatNumber(resources.metal)}
              </div>
              <div className="muted">+{Math.round(overview.production.metalPerHour)}/h</div>
              <div className="muted">Cap: {formatNumber(storage.metal)}</div>
            </div>
            <div className="card">
              <div className="muted">Cristal</div>
              <div className="brand" style={{ fontSize: 20 }}>
                {formatNumber(resources.crystal)}
              </div>
              <div className="muted">+{Math.round(overview.production.crystalPerHour)}/h</div>
              <div className="muted">Cap: {formatNumber(storage.crystal)}</div>
            </div>
            <div className="card">
              <div className="muted">Deuterium</div>
              <div className="brand" style={{ fontSize: 20 }}>
                {formatNumber(resources.deut)}
              </div>
              <div className="muted">+{Math.round(overview.production.deutPerHour)}/h</div>
              <div className="muted">Cap: {formatNumber(storage.deuterium)}</div>
            </div>
            <div className="card">
              <div className="muted">Energie</div>
              <div className="brand" style={{ fontSize: 20 }}>
                {overview.production.energy}
              </div>
              <div className="muted">
                Prod: {energyProduced} / Cons: {energyUsed}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'constructions' && (
        <>
          <div className="panel">
            <h2>Constructions</h2>
            <div className="list">{renderBuildingList(BuildingCategory.Production)}</div>
          </div>
        </>
      )}

      {activeTab === 'installations' && (
        <>
          <div className="panel">
            <h2>Installations</h2>
            <div className="list">{renderBuildingList(BuildingCategory.Installation)}</div>
          </div>
        </>
      )}

      {activeTab === 'research' && (
        <>
          <div className="panel">
            <h2>Recherches</h2>
            <div className="list">{renderResearchList()}</div>
          </div>
          {renderResearchDetails()}
        </>
      )}

      {activeTab === 'shipyard' && renderShipyard()}

      {activeTab === 'galaxy' && (
        <div className="panel">
          <h2>Galaxie</h2>
          <div className="muted">
            Position proche du soleil = plus d energie, moins de deut.
          </div>
          <div className="card" style={{ marginTop: 10 }}>
            <div>Position: {position}</div>
            <div>Temperature estimee: {temp}C</div>
            <div>Bonus energie: +{energyBonus}%</div>
            <div>Bonus deut: +{deutBonus}%</div>
          </div>
          <div className="solar-map">
            {Array.from({ length: 15 }).map((_, idx) => {
              const pos = idx + 1;
              return (
                <div
                  key={pos}
                  className={`solar-slot ${pos === position ? 'active' : ''}`}
                >
                  {pos}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="title-bar">
          <h2>File d attente</h2>
          <div className="muted">Temps reel</div>
        </div>
        <div className="list" style={{ marginTop: 10 }}>
          {queue.length === 0 && <div className="muted">Aucun element en cours.</div>}
          {queue.map((item) => {
            const end = new Date(item.endAt).getTime();
            const remaining = Math.max(0, Math.floor((end - now) / 1000));
            return (
              <div key={item.id} className="card row between">
                <div>
                  <div>
                    {item.type} - {item.key}
                  </div>
                  <div className="muted">
                    Niveau/Qte: {item.levelOrQty} - Fin {new Date(end).toLocaleTimeString()}
                  </div>
                </div>
                <div className="pill">{formatDuration(remaining)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

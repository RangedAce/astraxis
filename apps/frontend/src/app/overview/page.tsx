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
  calculateBuildingCost,
  calculateBuildingTimeSeconds,
  calculateProductionFromLevels,
  calculateResearchCost,
  calculateResearchTimeSeconds,
  calculateShipBuildTimeSeconds,
  calculateShipCost,
  calculateStorageCapacities,
  getPositionModifiers,
  positionToTemperature
} from '@astraxis/shared';
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
  startAt: string;
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

const FUTURE_LEVELS = 3;

export default function OverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<any>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [resources, setResources] = useState({ metal: 0, crystal: 0, deut: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('constructions');
  const [selectedResearch, setSelectedResearch] = useState<ResearchKey | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingKey | null>(null);
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

  useEffect(() => {
    if (!selectedBuilding) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedBuilding(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedBuilding]);

  useEffect(() => {
    if (!selectedResearch) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedResearch(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedResearch]);

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
      setSelectedResearch(null);
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

  async function handleBuilding(key: BuildingKey) {
    if (!planetId) return;
    setError(null);
    try {
      await startBuilding(planetId, key);
      await reload();
      setSelectedBuilding(null);
    } catch (err: any) {
      setError(err.message || 'Impossible de lancer la construction');
    }
  }

  function logout() {
    clearSession();
    router.push('/login');
  }

  function formatGain(seconds: number) {
    const gain = Math.max(0, Math.floor(seconds));
    return gain > 0 ? `gain ${formatDuration(gain)}` : 'gain 0s';
  }

  function renderResourceCost(cost: { metal: number; crystal: number; deuterium: number }) {
    return (
      <div className="resource-row">
        <span className="resource-chip metal">Metal {formatNumber(cost.metal)}</span>
        <span className="resource-chip crystal">Cristal {formatNumber(cost.crystal)}</span>
        <span className="resource-chip deut">Deut {formatNumber(cost.deuterium)}</span>
      </div>
    );
  }

  if (loading && !overview) {
    return <div className="muted">Chargement...</div>;
  }

  const planet = overview?.planet;
  const universe = planet?.universe;
  const position = planet?.position ?? 1;
  const storage = overview?.storage ?? { metal: 0, crystal: 0, deuterium: 0 };
  const productionFactors = overview?.productionFactors ?? {};
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
      const isMine =
        key === BuildingKey.MetalMine ||
        key === BuildingKey.CrystalMine ||
        key === BuildingKey.DeuteriumSynthesizer;
      const storage =
        key === BuildingKey.MetalStorage
          ? overview?.storage?.metal
          : key === BuildingKey.CrystalStorage
            ? overview?.storage?.crystal
            : key === BuildingKey.DeuteriumTank
              ? overview?.storage?.deuterium
              : null;
      return (
        <div key={key} className="card visual">
          <div className="row between">
            <div className="row gap">
              {meta.imageUrl ? (
                <img src={meta.imageUrl} alt={meta.label} className="icon" />
              ) : (
                <div className="icon placeholder" />
              )}
              <div>
                <div className="card-title">{meta.label}</div>
                <div className="muted">Niveau {level}</div>
                <div className="muted small">Apporte: {meta.description}</div>
                {storage !== null && (
                  <div className="muted small">Cap: {formatNumber(storage)}</div>
                )}
                {storage === null && isMine && (
                  <div className="muted small">Prod: {factor}%</div>
                )}
              </div>
            </div>
            <div className="row gap">
              <button className="btn primary" onClick={() => setSelectedBuilding(key)}>
                Ameliorer
              </button>
            </div>
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
        <div key={key} className="card visual">
          <div className="row between">
          <div className="row gap">
            {meta.imageUrl ? (
              <img src={meta.imageUrl} alt={meta.label} className="icon" />
            ) : (
              <div className="icon placeholder" />
            )}
            <div>
              <div className="card-title">{meta.label}</div>
              <div className="muted">Niveau {level}</div>
              <div className="muted small">Apporte: {meta.description}</div>
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
        </div>
      );
    });
  }

  function renderResearchModal() {
    if (!selectedResearch || !planet || !universe) return null;
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
    const futureLevels = Array.from({ length: FUTURE_LEVELS }, (_, idx) => level + idx + 1);
    return (
      <div className="modal-backdrop" onClick={() => setSelectedResearch(null)}>
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <div className="row gap">
              {meta.imageUrl ? (
                <img src={meta.imageUrl} alt={meta.label} className="icon" />
              ) : (
                <div className="icon placeholder" />
              )}
              <div>
                <div className="modal-title">{meta.label}</div>
                <div className="muted small">
                  Niveau {level} -&gt; {nextLevel}
                </div>
              </div>
            </div>
            <button className="btn" onClick={() => setSelectedResearch(null)}>
              Fermer
            </button>
          </div>
          <div className="modal-body">
            <div className="muted">Apporte: {meta.description}</div>
            <div className="detail-grid" style={{ marginTop: 12 }}>
              <div className="card highlight">
                <div className="muted">Cout niveau {nextLevel}</div>
                {renderResourceCost(cost)}
              </div>
              <div className="card highlight">
                <div className="muted">Temps estime</div>
                <div className="stat">{formatDuration(duration)}</div>
                <div className="muted small">Labo niv {labLevel}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => handleResearch(selectedResearch)}>
                Lancer la recherche
              </button>
            </div>
            <div className="section-title">Prochains niveaux</div>
            <div className="future-grid">
              {futureLevels.map((targetLevel) => {
                const futureCost = calculateResearchCost(selectedResearch, targetLevel);
                const futureDuration = calculateResearchTimeSeconds(
                  selectedResearch,
                  targetLevel,
                  universe.speedResearch,
                  labLevel
                );
                return (
                  <div key={targetLevel} className="card future-card">
                    <div className="future-title">Niveau {targetLevel}</div>
                    <div className="muted small">Apporte: {meta.description}</div>
                    {renderResourceCost(futureCost)}
                    <div className="muted small">Temps: {formatDuration(futureDuration)}</div>
                  </div>
                );
              })}
            </div>
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
            <div className="card highlight">
              <div className="muted">Cout</div>
              {renderResourceCost(cost)}
              <div className="muted small" style={{ marginTop: 6 }}>
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

  function renderBuildingModal() {
    if (!selectedBuilding || !planet || !universe) return null;
    const meta = BUILDING_META[selectedBuilding];
    const currentLevel = buildingsMap[selectedBuilding] ?? 0;
    const nextLevel = currentLevel + 1;
    const cost = calculateBuildingCost(selectedBuilding, nextLevel);
    const duration = calculateBuildingTimeSeconds(selectedBuilding, nextLevel, universe.speedBuild);
    const shipyardLevel = buildingsMap[BuildingKey.Shipyard] ?? 0;
    const roboticsLevel = buildingsMap[BuildingKey.RoboticsFactory] ?? 0;
    const labLevel = buildingsMap[BuildingKey.ResearchLab] ?? 0;
    const sampleShip = ShipKey.SmallCargo;
    const sampleResearch = ResearchKey.Energy;
    const sampleResearchLevel = Math.max(1, (researchMap[sampleResearch] ?? 0) + 1);
    const baseShipTime = calculateShipBuildTimeSeconds(
      sampleShip,
      1,
      universe.speedBuild,
      shipyardLevel,
      roboticsLevel
    );
    const baseResearchTime = calculateResearchTimeSeconds(
      sampleResearch,
      sampleResearchLevel,
      universe.speedResearch,
      labLevel
    );
    const currentProd = calculateProductionFromLevels(
      buildingsMap,
      position,
      productionFactors
    );
    const currentStorage = calculateStorageCapacities(buildingsMap);
    const isMine =
      selectedBuilding === BuildingKey.MetalMine ||
      selectedBuilding === BuildingKey.CrystalMine ||
      selectedBuilding === BuildingKey.DeuteriumSynthesizer;
    const isStorage =
      selectedBuilding === BuildingKey.MetalStorage ||
      selectedBuilding === BuildingKey.CrystalStorage ||
      selectedBuilding === BuildingKey.DeuteriumTank;

    const impactForLevel = (targetLevel: number) => {
      if (isStorage) {
        const futureStorage = calculateStorageCapacities({
          ...buildingsMap,
          [selectedBuilding]: targetLevel
        });
        if (selectedBuilding === BuildingKey.MetalStorage) {
          return [
            `Metal: ${formatNumber(futureStorage.metal)} (+${formatNumber(
              futureStorage.metal - currentStorage.metal
            )})`
          ];
        }
        if (selectedBuilding === BuildingKey.CrystalStorage) {
          return [
            `Cristal: ${formatNumber(futureStorage.crystal)} (+${formatNumber(
              futureStorage.crystal - currentStorage.crystal
            )})`
          ];
        }
        return [
          `Deut: ${formatNumber(futureStorage.deuterium)} (+${formatNumber(
            futureStorage.deuterium - currentStorage.deuterium
          )})`
        ];
      }

      if (isMine || selectedBuilding === BuildingKey.SolarPlant) {
        const futureProd = calculateProductionFromLevels(
          { ...buildingsMap, [selectedBuilding]: targetLevel },
          position,
          productionFactors
        );
        const deltaMetal = Math.round(futureProd.metalPerHour - currentProd.metalPerHour);
        const deltaCrystal = Math.round(
          futureProd.crystalPerHour - currentProd.crystalPerHour
        );
        const deltaDeut = Math.round(futureProd.deutPerHour - currentProd.deutPerHour);
        const deltaEnergy = futureProd.energy - currentProd.energy;
        return [
          `Metal/h: ${formatNumber(futureProd.metalPerHour)} (${deltaMetal >= 0 ? '+' : ''}${deltaMetal})`,
          `Cristal/h: ${formatNumber(futureProd.crystalPerHour)} (${deltaCrystal >= 0 ? '+' : ''}${deltaCrystal})`,
          `Deut/h: ${formatNumber(futureProd.deutPerHour)} (${deltaDeut >= 0 ? '+' : ''}${deltaDeut})`,
          `Energie: ${futureProd.energy} (${deltaEnergy >= 0 ? '+' : ''}${deltaEnergy})`
        ];
      }

      if (selectedBuilding === BuildingKey.RoboticsFactory) {
        const futureTime = calculateShipBuildTimeSeconds(
          sampleShip,
          1,
          universe.speedBuild,
          shipyardLevel,
          targetLevel
        );
        return [
          `Petit transporteur: ${formatDuration(futureTime)} (${formatGain(
            baseShipTime - futureTime
          )})`
        ];
      }

      if (selectedBuilding === BuildingKey.Shipyard) {
        const futureTime = calculateShipBuildTimeSeconds(
          sampleShip,
          1,
          universe.speedBuild,
          targetLevel,
          roboticsLevel
        );
        return [
          `Petit transporteur: ${formatDuration(futureTime)} (${formatGain(
            baseShipTime - futureTime
          )})`
        ];
      }

      const futureResearchTime = calculateResearchTimeSeconds(
        sampleResearch,
        sampleResearchLevel,
        universe.speedResearch,
        targetLevel
      );
      return [
        `Recherche Energie niv ${sampleResearchLevel}: ${formatDuration(
          futureResearchTime
        )} (${formatGain(baseResearchTime - futureResearchTime)})`
      ];
    };

    const futureLevels = Array.from({ length: FUTURE_LEVELS }, (_, idx) => currentLevel + idx + 1);

    return (
      <div className="modal-backdrop" onClick={() => setSelectedBuilding(null)}>
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <div className="row gap">
              {meta.imageUrl ? (
                <img src={meta.imageUrl} alt={meta.label} className="icon" />
              ) : (
                <div className="icon placeholder" />
              )}
              <div>
                <div className="modal-title">{meta.label}</div>
                <div className="muted small">
                  Niveau {currentLevel} -&gt; {nextLevel}
                </div>
              </div>
            </div>
            <button className="btn" onClick={() => setSelectedBuilding(null)}>
              Fermer
            </button>
          </div>
          <div className="modal-body">
            <div className="muted">Apporte: {meta.description}</div>
            <div className="detail-grid" style={{ marginTop: 12 }}>
              <div className="card highlight">
                <div className="muted">Cout niveau {nextLevel}</div>
                {renderResourceCost(cost)}
              </div>
              <div className="card highlight">
                <div className="muted">Temps estime</div>
                <div className="stat">{formatDuration(duration)}</div>
                <div className="muted small">Niveau actuel {currentLevel}</div>
              </div>
            </div>
            <div className="card highlight" style={{ marginTop: 12 }}>
              <div className="muted">Impact</div>
              {impactForLevel(nextLevel).map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => handleBuilding(selectedBuilding)}>
                Lancer l amelioration
              </button>
            </div>
            <div className="section-title">Prochains niveaux</div>
            <div className="future-grid">
              {futureLevels.map((targetLevel) => {
                const futureCost = calculateBuildingCost(selectedBuilding, targetLevel);
                const futureDuration = calculateBuildingTimeSeconds(
                  selectedBuilding,
                  targetLevel,
                  universe.speedBuild
                );
                const impactLines = impactForLevel(targetLevel);
                return (
                  <div key={targetLevel} className="card future-card">
                    <div className="future-title">Niveau {targetLevel}</div>
                    {renderResourceCost(futureCost)}
                    <div className="muted small">Temps: {formatDuration(futureDuration)}</div>
                    <div className="future-impact">
                      {impactLines.map((line) => (
                        <div key={line} className="muted small">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="title-bar">
        <h2>Vue d ensemble</h2>
        <div className="row gap">
          {universe && <div className="pill">{universe.name}</div>}
          <Link className="btn" href="/hub">
            Hub
          </Link>
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
            <div className="card resource-card resource-metal">
              <div className="resource-label">Metal</div>
              <div className="resource-value">{formatNumber(resources.metal)}</div>
              <div className="resource-meta">
                +{Math.round(overview.production.metalPerHour)}/h
              </div>
              <div className="resource-meta">Cap: {formatNumber(storage.metal)}</div>
            </div>
            <div className="card resource-card resource-crystal">
              <div className="resource-label">Cristal</div>
              <div className="resource-value">{formatNumber(resources.crystal)}</div>
              <div className="resource-meta">
                +{Math.round(overview.production.crystalPerHour)}/h
              </div>
              <div className="resource-meta">Cap: {formatNumber(storage.crystal)}</div>
            </div>
            <div className="card resource-card resource-deut">
              <div className="resource-label">Deuterium</div>
              <div className="resource-value">{formatNumber(resources.deut)}</div>
              <div className="resource-meta">+{Math.round(overview.production.deutPerHour)}/h</div>
              <div className="resource-meta">Cap: {formatNumber(storage.deuterium)}</div>
            </div>
            <div className="card resource-card resource-energy">
              <div className="resource-label">Energie</div>
              <div className="resource-value">{overview.production.energy}</div>
              <div className="resource-meta">Prod: {energyProduced} / Cons: {energyUsed}</div>
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
            const start = new Date(item.startAt).getTime();
            const end = new Date(item.endAt).getTime();
            const remaining = Math.max(0, Math.floor((end - now) / 1000));
            const untilStart = Math.max(0, Math.floor((start - now) / 1000));
            const buildDuration = Math.max(0, Math.floor((end - start) / 1000));
            const isBuilding = item.type === 'BUILDING';
            return (
              <div key={item.id} className="card row between">
                <div>
                  <div>
                    {item.type} - {item.key}
                  </div>
                  <div className="muted">
                    Niveau/Qte: {item.levelOrQty} - Fin {new Date(end).toLocaleTimeString()}
                  </div>
                  {isBuilding && untilStart > 0 && (
                    <div className="muted">
                      Demarre dans {formatDuration(untilStart)} - Temps {formatDuration(buildDuration)}
                    </div>
                  )}
                </div>
                <div className="pill">
                  {isBuilding && untilStart > 0
                    ? formatDuration(buildDuration)
                    : formatDuration(remaining)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {renderBuildingModal()}
      {renderResearchModal()}
    </div>
  );
}

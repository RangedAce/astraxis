'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  BUILDING_META,
  BuildingKey,
  calculateBuildingCost,
  calculateBuildingTimeSeconds,
  calculateProductionFromLevels,
  calculateStorageCapacities
} from '@astraxis/shared';
import { fetchOverview, startBuilding, updateProductionFactor } from '../../../lib/api';
import { loadSession } from '../../../lib/auth';

type QueueItem = {
  id: string;
  type: string;
  key: string;
  levelOrQty: number;
  startAt: string;
  endAt: string;
};

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

export default function BuildingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [factor, setFactor] = useState(100);

  const keyParam = Array.isArray(params?.key) ? params.key[0] : params?.key;
  const buildingKey = Object.values(BuildingKey).includes(keyParam as BuildingKey)
    ? (keyParam as BuildingKey)
    : null;

  const universeId = searchParams.get('universe');
  const planetId = searchParams.get('planet') || loadSession()?.planetId || '';

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const reload = useCallback(async () => {
    const session = loadSession();
    if (!session || !universeId || !planetId || !buildingKey) return;
    try {
      setLoading(true);
      const data = await fetchOverview(universeId, planetId);
      setOverview(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [buildingKey, planetId, universeId]);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.push('/login');
      return;
    }
    if (!universeId || !planetId) {
      router.push('/overview');
      return;
    }
    reload();
  }, [planetId, universeId, reload, router]);

  useEffect(() => {
    if (!buildingKey || !overview) return;
    const current = overview.productionFactors?.[buildingKey] ?? 100;
    setFactor(current);
  }, [buildingKey, overview]);

  const buildingsMap = useMemo(() => {
    const map: Record<string, number> = {};
    overview?.buildings?.forEach((b: any) => {
      map[b.buildingKey] = b.level;
    });
    return map;
  }, [overview]);

  if (!buildingKey) {
    return <div className="danger">Batiment inconnu.</div>;
  }

  if (loading && !overview) {
    return <div className="muted">Chargement...</div>;
  }
  if (!overview) {
    return <div className="danger">Impossible de charger la planete.</div>;
  }

  const resources = overview?.resources ?? { metal: 0, crystal: 0, deuterium: 0 };
  const planet = overview?.planet;
  const universe = planet?.universe;
  const position = planet?.position ?? 1;
  const level = buildingsMap[buildingKey] ?? 0;
  const nextLevel = level + 1;
  const cost = calculateBuildingCost(buildingKey, nextLevel);
  const duration = universe
    ? calculateBuildingTimeSeconds(buildingKey, nextLevel, universe.speedBuild)
    : 0;
  const productionFactors = overview?.productionFactors ?? {};
  const currentProd = calculateProductionFromLevels(buildingsMap, position, productionFactors);
  const nextMap = { ...buildingsMap, [buildingKey]: nextLevel };
  const nextProd = calculateProductionFromLevels(nextMap, position, productionFactors);
  const currentStorage = calculateStorageCapacities(buildingsMap);
  const nextStorage = calculateStorageCapacities(nextMap);

  const deltaMetal = nextProd.metalPerHour - currentProd.metalPerHour;
  const deltaCrystal = nextProd.crystalPerHour - currentProd.crystalPerHour;
  const deltaDeut = nextProd.deutPerHour - currentProd.deutPerHour;
  const deltaEnergy = nextProd.energy - currentProd.energy;
  const deltaEnergyUsed = (nextProd.energyUsed ?? 0) - (currentProd.energyUsed ?? 0);

  const isMine =
    buildingKey === BuildingKey.MetalMine ||
    buildingKey === BuildingKey.CrystalMine ||
    buildingKey === BuildingKey.DeuteriumSynthesizer;
  const isStorage =
    buildingKey === BuildingKey.MetalStorage ||
    buildingKey === BuildingKey.CrystalStorage ||
    buildingKey === BuildingKey.DeuteriumTank;

  const buildingQueue: QueueItem[] = (overview?.queue || []).filter(
    (item: QueueItem) => item.type === 'BUILDING'
  );

  async function handleStart() {
    if (!planetId || !buildingKey) return;
    setError(null);
    try {
      await startBuilding(planetId, buildingKey);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Impossible de lancer la construction');
    }
  }

  async function handleUpdateFactor() {
    if (!planetId || !buildingKey || !isMine) return;
    setError(null);
    try {
      await updateProductionFactor(planetId, buildingKey, factor);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Impossible de mettre a jour la production');
    }
  }

  const meta = BUILDING_META[buildingKey];

  return (
    <div className="grid">
      <div className="title-bar">
        <h2>{meta?.label ?? buildingKey}</h2>
        <div className="row gap">
          <Link className="btn" href="/hub">
            Hub
          </Link>
          <Link className="btn" href={`/overview?planet=${planetId}&universe=${universeId}`}>
            Retour
          </Link>
        </div>
      </div>

      {error && <div className="danger">{error}</div>}

      <div className="panel">
        <div className="title-bar">
          <h2>Ressources</h2>
          {universe && <div className="pill">{universe.name}</div>}
        </div>
        <div className="grid two" style={{ marginTop: 10 }}>
          <div className="card resource-card resource-metal">
            <div className="resource-label">Metal</div>
            <div className="resource-value">{formatNumber(resources.metal)}</div>
          </div>
          <div className="card resource-card resource-crystal">
            <div className="resource-label">Cristal</div>
            <div className="resource-value">{formatNumber(resources.crystal)}</div>
          </div>
          <div className="card resource-card resource-deut">
            <div className="resource-label">Deuterium</div>
            <div className="resource-value">{formatNumber(resources.deuterium)}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="muted">Niveau actuel: {level}</div>
        <div className="muted">Prochain niveau: {nextLevel}</div>
        {meta?.description && <div className="muted">{meta.description}</div>}
        <div className="grid two" style={{ marginTop: 12 }}>
          <div className="card">
            <div className="muted">Cout</div>
            <div>Metal: {formatNumber(cost.metal)}</div>
            <div>Cristal: {formatNumber(cost.crystal)}</div>
            <div>Deut: {formatNumber(cost.deuterium)}</div>
          </div>
          <div className="card">
            <div className="muted">Temps</div>
            <div>{formatDuration(duration)}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={handleStart}>
            Lancer l amelioration
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Impact production</h2>
        {isStorage && (
          <div className="card">
            <div className="muted">Stockage max</div>
            {buildingKey === BuildingKey.MetalStorage && (
              <div>
                Metal: {formatNumber(nextStorage.metal)} (+{formatNumber(nextStorage.metal - currentStorage.metal)})
              </div>
            )}
            {buildingKey === BuildingKey.CrystalStorage && (
              <div>
                Cristal: {formatNumber(nextStorage.crystal)} (+{formatNumber(nextStorage.crystal - currentStorage.crystal)})
              </div>
            )}
            {buildingKey === BuildingKey.DeuteriumTank && (
              <div>
                Deut: {formatNumber(nextStorage.deuterium)} (+{formatNumber(nextStorage.deuterium - currentStorage.deuterium)})
              </div>
            )}
          </div>
        )}
        {!isStorage && (
          <div className="card">
            <div>Metal/h: {formatNumber(nextProd.metalPerHour)} (+{Math.round(deltaMetal)})</div>
            <div>Cristal/h: {formatNumber(nextProd.crystalPerHour)} (+{Math.round(deltaCrystal)})</div>
            <div>Deut/h: {formatNumber(nextProd.deutPerHour)} (+{Math.round(deltaDeut)})</div>
            <div>Energie: {nextProd.energy} ({deltaEnergy >= 0 ? '+' : ''}{deltaEnergy})</div>
            <div>
              Consommation: {nextProd.energyUsed ?? 0} ({deltaEnergyUsed >= 0 ? '+' : ''}{deltaEnergyUsed})
            </div>
          </div>
        )}
      </div>

      {isMine && (
        <div className="panel">
          <h2>Reglage production</h2>
          <div className="muted">Regle la consommation d energie de cette mine.</div>
          <div className="stack" style={{ marginTop: 10 }}>
            <input
              className="input"
              type="range"
              min={0}
              max={100}
              step={5}
              value={factor}
              onChange={(e) => setFactor(parseInt(e.target.value, 10))}
            />
            <div className="muted">Production: {factor}%</div>
            <button className="btn" onClick={handleUpdateFactor}>
              Appliquer
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="title-bar">
          <h2>File de construction</h2>
          <div className="muted">Temps reel</div>
        </div>
        <div className="list" style={{ marginTop: 10 }}>
          {buildingQueue.length === 0 && <div className="muted">Aucun batiment en cours.</div>}
          {buildingQueue.map((item) => {
            const start = new Date(item.startAt).getTime();
            const end = new Date(item.endAt).getTime();
            const remaining = Math.max(0, Math.floor((end - now) / 1000));
            const untilStart = Math.max(0, Math.floor((start - now) / 1000));
            const buildDuration = Math.max(0, Math.floor((end - start) / 1000));
            return (
              <div key={item.id} className="card row between">
                <div>
                  <div>{item.key}</div>
                  <div className="muted">
                    Niveau: {item.levelOrQty} - Fin {new Date(end).toLocaleTimeString()}
                  </div>
                  {untilStart > 0 && (
                    <div className="muted">
                      Demarre dans {formatDuration(untilStart)} - Temps{' '}
                      {formatDuration(buildDuration)}
                    </div>
                  )}
                </div>
                <div className="pill">
                  {untilStart > 0 ? formatDuration(buildDuration) : formatDuration(remaining)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

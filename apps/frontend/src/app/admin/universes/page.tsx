'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createUniverse, fetchUniverses, updateUniverse } from '../../../lib/api';

export default function AdminUniversesPage() {
  const [name, setName] = useState('Alpha');
  const [speedFleet, setSpeedFleet] = useState(1);
  const [speedBuild, setSpeedBuild] = useState(2);
  const [speedResearch, setSpeedResearch] = useState(2);
  const [speedProduction, setSpeedProduction] = useState(1);
  const [maxSystems, setMaxSystems] = useState(499);
  const [maxPositions, setMaxPositions] = useState(15);
  const [isPeacefulDefault, setIsPeacefulDefault] = useState(true);
  const [adminToken, setAdminToken] = useState('');
  const [universes, setUniverses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function loadUniverses() {
    fetchUniverses()
      .then((data) => setUniverses(data))
      .catch(() => setUniverses([]));
  }

  useEffect(() => {
    loadUniverses();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await createUniverse({
        name,
        speedFleet,
        speedBuild,
        speedResearch,
        speedProduction,
        maxSystems,
        maxPositions,
        isPeacefulDefault,
        adminToken
      });
      setSuccess('Univers cree');
      loadUniverses();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    }
  }

  return (
    <div className="grid">
      <div className="panel">
        <h2>Admin - Univers</h2>
        <form className="stack" onSubmit={onSubmit}>
          <div className="field">
            <label>Admin token</label>
            <input
              className="input"
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Nom</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Vitesse flotte</label>
            <input
              className="input"
              type="number"
              min={1}
              value={speedFleet}
              onChange={(e) => setSpeedFleet(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field">
            <label>Vitesse construction</label>
            <input
              className="input"
              type="number"
              min={1}
              value={speedBuild}
              onChange={(e) => setSpeedBuild(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field">
            <label>Vitesse recherche</label>
            <input
              className="input"
              type="number"
              min={1}
              value={speedResearch}
              onChange={(e) => setSpeedResearch(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field">
            <label>Vitesse production</label>
            <input
              className="input"
              type="number"
              min={1}
              value={speedProduction}
              onChange={(e) => setSpeedProduction(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field">
            <label>Taille (systemes)</label>
            <input
              className="input"
              type="number"
              min={1}
              value={maxSystems}
              onChange={(e) => setMaxSystems(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field">
            <label>Taille (positions)</label>
            <input
              className="input"
              type="number"
              min={1}
              value={maxPositions}
              onChange={(e) => setMaxPositions(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={isPeacefulDefault}
                onChange={(e) => setIsPeacefulDefault(e.target.checked)}
              />{' '}
              Pacifique par defaut
            </label>
          </div>
          {error && <div className="danger">{error}</div>}
          {success && <div className="pill">{success}</div>}
          <button className="btn primary" type="submit">
            Creer
          </button>
        </form>
      </div>
      <div className="panel">
        <h2>Univers existants</h2>
        <div className="list">
          {universes.map((uni) => (
            <div key={uni.id} className="card">
              <div className="stack">
                <div className="field">
                  <label>Nom</label>
                  <input
                    className="input"
                    value={uni.name}
                    onChange={(e) =>
                      setUniverses((prev) =>
                        prev.map((item) =>
                          item.id === uni.id ? { ...item, name: e.target.value } : item
                        )
                      )
                    }
                  />
                </div>
                <div className="grid two">
                  <div className="field">
                    <label>Fleet</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={uni.speedFleet}
                      onChange={(e) =>
                        setUniverses((prev) =>
                          prev.map((item) =>
                            item.id === uni.id
                              ? { ...item, speedFleet: parseInt(e.target.value, 10) }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Build</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={uni.speedBuild}
                      onChange={(e) =>
                        setUniverses((prev) =>
                          prev.map((item) =>
                            item.id === uni.id
                              ? { ...item, speedBuild: parseInt(e.target.value, 10) }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Research</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={uni.speedResearch}
                      onChange={(e) =>
                        setUniverses((prev) =>
                          prev.map((item) =>
                            item.id === uni.id
                              ? { ...item, speedResearch: parseInt(e.target.value, 10) }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Production</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={uni.speedProduction ?? 1}
                      onChange={(e) =>
                        setUniverses((prev) =>
                          prev.map((item) =>
                            item.id === uni.id
                              ? { ...item, speedProduction: parseInt(e.target.value, 10) }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Systemes</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={uni.maxSystems ?? 499}
                      onChange={(e) =>
                        setUniverses((prev) =>
                          prev.map((item) =>
                            item.id === uni.id
                              ? { ...item, maxSystems: parseInt(e.target.value, 10) }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Positions</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={uni.maxPositions ?? 15}
                      onChange={(e) =>
                        setUniverses((prev) =>
                          prev.map((item) =>
                            item.id === uni.id
                              ? { ...item, maxPositions: parseInt(e.target.value, 10) }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label>
                      <input
                        type="checkbox"
                        checked={uni.isPeacefulDefault}
                        onChange={(e) =>
                          setUniverses((prev) =>
                            prev.map((item) =>
                              item.id === uni.id
                                ? { ...item, isPeacefulDefault: e.target.checked }
                                : item
                            )
                          )
                        }
                      />{' '}
                      Pacifique
                    </label>
                  </div>
                </div>
                <button
                  className="btn primary"
                  onClick={async () => {
                    setError(null);
                    setSuccess(null);
                    setSavingId(uni.id);
                    try {
                      await updateUniverse(uni.id, {
                        name: uni.name,
                        speedFleet: uni.speedFleet,
                        speedBuild: uni.speedBuild,
                        speedResearch: uni.speedResearch,
                        speedProduction: uni.speedProduction ?? 1,
                        maxSystems: uni.maxSystems ?? 499,
                        maxPositions: uni.maxPositions ?? 15,
                        isPeacefulDefault: uni.isPeacefulDefault,
                        adminToken
                      });
                      setSuccess('Univers mis a jour');
                      loadUniverses();
                    } catch (err: any) {
                      setError(err.message || 'Erreur');
                    } finally {
                      setSavingId(null);
                    }
                  }}
                  disabled={savingId === uni.id || !adminToken}
                >
                  {savingId === uni.id ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          ))}
          {universes.length === 0 && <div className="muted">Aucun univers</div>}
        </div>
      </div>
    </div>
  );
}

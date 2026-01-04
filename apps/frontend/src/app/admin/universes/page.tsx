'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createUniverse, fetchUniverses } from '../../../lib/api';

export default function AdminUniversesPage() {
  const [name, setName] = useState('Alpha');
  const [speedFleet, setSpeedFleet] = useState(1);
  const [speedBuild, setSpeedBuild] = useState(2);
  const [speedResearch, setSpeedResearch] = useState(2);
  const [isPeacefulDefault, setIsPeacefulDefault] = useState(true);
  const [adminToken, setAdminToken] = useState('');
  const [universes, setUniverses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
              <div>{uni.name}</div>
              <div className="muted">
                Fleet x{uni.speedFleet} · Build x{uni.speedBuild} · Research x
                {uni.speedResearch} · Pacifique {uni.isPeacefulDefault ? 'oui' : 'non'}
              </div>
            </div>
          ))}
          {universes.length === 0 && <div className="muted">Aucun univers</div>}
        </div>
      </div>
    </div>
  );
}

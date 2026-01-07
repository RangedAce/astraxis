'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { fetchProfile, updateProfile } from '../../lib/api';
import { clearSession } from '../../lib/auth';

export default function HubPage() {
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((data) => {
        setProfile(data);
        setEmail(data?.email || '');
      })
      .catch((err) => {
        setError(err.message || 'Erreur');
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const payload: { email?: string; password?: string } = {};
      if (email && email !== profile?.email) payload.email = email;
      if (password) payload.password = password;
      const updated = await updateProfile(payload);
      setProfile(updated);
      setSuccess('Profil mis a jour');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearSession();
    window.location.href = '/login';
  }

  if (loading) {
    return <div className="muted">Chargement...</div>;
  }

  return (
    <div className="grid">
      <div className="title-bar">
        <h2>Hub</h2>
        <button className="btn" onClick={logout}>
          Deconnexion
        </button>
      </div>

      {error && <div className="danger">{error}</div>}
      {success && <div className="pill">{success}</div>}

      <div className="panel">
        <h2>Mon compte</h2>
        <form className="stack" onSubmit={onSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Nouveau mot de passe</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              placeholder="Laisser vide pour ne pas changer"
            />
          </div>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Mettre a jour'}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Mes univers</h2>
        <div className="list">
          {(profile?.players || []).map((player: any) => {
            const universe = player.universe;
            const planet = player.planets?.[0];
            return (
              <div key={player.id} className="card visual">
                <div className="row between">
                  <div>
                    <div className="card-title">{universe?.name ?? 'Univers'}</div>
                    <div className="muted small">
                      Build x{universe?.speedBuild ?? 1} · Research x{universe?.speedResearch ?? 1} ·
                      Prod x{universe?.speedProduction ?? 1} · Fleet x{universe?.speedFleet ?? 1}
                    </div>
                    <div className="muted small">
                      Taille: {universe?.maxSystems ?? 499} systemes · {universe?.maxPositions ?? 15} positions
                    </div>
                    <div className="muted small">Pseudo: {player.nickname}</div>
                  </div>
                  {universe?.id && planet?.id ? (
                    <Link
                      className="btn primary"
                      href={`/overview?universe=${universe.id}&planet=${planet.id}`}
                    >
                      Entrer
                    </Link>
                  ) : (
                    <div className="muted">Aucune planete</div>
                  )}
                </div>
              </div>
            );
          })}
          {(!profile?.players || profile.players.length === 0) && (
            <div className="muted">Aucun univers associe</div>
          )}
        </div>
      </div>
    </div>
  );
}

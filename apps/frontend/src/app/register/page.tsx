'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { fetchUniverses, registerWithUniverse } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [universeId, setUniverseId] = useState<string>('');
  const [universes, setUniverses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUniverses()
      .then((data) => {
        setUniverses(data);
        if (data?.[0]?.id) {
          setUniverseId(data[0].id);
        }
      })
      .catch(() => {
        setUniverses([]);
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registerWithUniverse(email, password, nickname, universeId || undefined);
      router.push('/hub');
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2>Inscription</h2>
      <form className="stack" onSubmit={onSubmit}>
        <div className="field">
          <label>Nickname</label>
          <input
            className="input"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Univers</label>
          <select
            className="input"
            value={universeId}
            onChange={(e) => setUniverseId(e.target.value)}
          >
            {universes.length === 0 && <option value="">Chargement...</option>}
            {universes.map((uni) => (
              <option key={uni.id} value={uni.id}>
                {uni.name} - x{uni.speedBuild} build - x{uni.speedResearch} research - x{uni.speedProduction ?? 1} prod - {uni.maxSystems ?? 499} sys
              </option>
            ))}
          </select>
        </div>
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
          <label>Mot de passe</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && <div className="danger">{error}</div>}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Creation...' : 'Creer le compte'}
        </button>
        <div className="muted">
          Deja inscrit ? <Link href="/login">Connexion</Link>
        </div>
      </form>
    </div>
  );
}

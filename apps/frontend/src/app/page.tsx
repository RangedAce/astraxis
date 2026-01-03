import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="panel">
      <h2>Bienvenue dans Astraxis</h2>
      <p className="muted">
        Construisez vos colonies en temps r&eacute;el. Connectez-vous pour commencer.
      </p>
      <div className="row" style={{ marginTop: '12px' }}>
        <Link className="btn primary" href="/login">
          Connexion
        </Link>
        <Link className="btn" href="/register">
          Cr&eacute;er un compte
        </Link>
      </div>
    </div>
  );
}

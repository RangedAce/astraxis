import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Astraxis',
  description: 'OGame-like realtime browser game'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="app-shell">
        <script src="/env.js" />
        <div className="app-container">
          <header className="app-header">
            <div className="brand">Astraxis</div>
            <div className="tagline">Realtime empire building</div>
          </header>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}

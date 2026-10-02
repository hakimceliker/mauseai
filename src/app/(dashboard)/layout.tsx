import type { ReactNode } from 'react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mouseai-shell">
      <aside className="mouseai-sidebar" aria-label="Ana navigasyon">
        <Link href="/operations" className="mouseai-brand"><span className="mouseai-brand-mark">M</span><span>MouseAI</span></Link>
        <nav className="mouseai-nav">
          <Link href="/operations" className="mouseai-nav-link mouseai-nav-link-active"><span className="mouseai-nav-glyph">W</span>Çalışma Alanı</Link>
          <Link href="/tasks/new" className="mouseai-nav-link"><span className="mouseai-nav-glyph">T</span>Görevler</Link>
          <Link href="/operations#ai-team" className="mouseai-nav-link"><span className="mouseai-nav-glyph">A</span>AI Ekibim</Link>
          <Link href="/operations#knowledge" className="mouseai-nav-link"><span className="mouseai-nav-glyph">K</span>Bilgi Kaynakları</Link>
          <Link href="/operations#integrations" className="mouseai-nav-link"><span className="mouseai-nav-glyph">I</span>Entegrasyonlar</Link>
          <Link href="/operations#reports" className="mouseai-nav-link"><span className="mouseai-nav-glyph">R</span>Raporlar</Link>
          <Link href="/operations#settings" className="mouseai-nav-link"><span className="mouseai-nav-glyph">S</span>Ayarlar</Link>
        </nav>
        <div className="mouseai-sidebar-footer"><strong>Daha fazlasını başarmaya hazır mısın?</strong><div className="mouseai-progress"><span style={{ width: '72%' }} /></div><small>Bu ay 342 görev tamamlandı</small></div>
      </aside>
      <div className="mouseai-content">
        <header className="mouseai-topbar">
          <div className="mouseai-search" role="search"><span>⌕</span><input aria-label="Ara" placeholder="Her yerde ara..." /></div>
          <div className="mouseai-userbar"><button className="mouseai-icon-button" aria-label="Bildirimler">!</button><span className="mouseai-avatar">DK</span><span className="mouseai-user-name">Deniz Karaca</span><span className="mouseai-chevron">⌄</span></div>
        </header>
        <main className="mouseai-main">{children}</main>
      </div>
    </div>
  );
}

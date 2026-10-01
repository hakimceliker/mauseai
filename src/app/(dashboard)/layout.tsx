import type { ReactNode } from 'react';
import Link from 'next/link';

const navItems = [
  ['Çalışma Alanı', '/operations', '⌂'], ['Görevler', '/operations', '✓'], ['AI Ekibim', '/operations', '♙'],
  ['Bilgi Kaynakları', '/operations', '▣'], ['Entegrasyonlar', '/operations', '↗'], ['Raporlar', '/operations', '▥'], ['Ayarlar', '/operations', '⚙'],
] as const;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="mouseai-light min-h-screen bg-[#fbfcff] text-slate-900">
    <header className="fixed inset-x-0 top-0 z-40 h-[74px] border-b border-slate-200/80 bg-white/95 backdrop-blur"><div className="flex h-full items-center justify-between px-5 lg:pl-[250px] lg:pr-8">
      <Link href="/operations" className="flex items-center gap-2 lg:hidden"><span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-bold text-white">M</span><span className="font-bold">MouseAI</span></Link>
      <div className="hidden w-full max-w-[520px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-400 lg:flex"><span aria-hidden="true">⌕</span><span>Görev, dosya, entegrasyon ara...</span><kbd className="ml-auto rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-400">⌘ K</kbd></div>
      <div className="flex items-center gap-5 text-sm"><span className="hidden items-center gap-2 text-slate-600 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" />Tüm sistemler çevrimiçi</span><span aria-label="Bildirimler" className="text-lg text-slate-500">♧</span><div className="hidden items-center gap-2 sm:flex"><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 font-semibold text-slate-600">DK</span><span className="text-xs"><strong className="block text-slate-800">Deniz Karaca</strong><span className="text-slate-400">Workspace yöneticisi</span></span></div></div>
    </div></header>
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[228px] border-r border-slate-200/80 bg-white px-4 pt-6 lg:block"><Link href="/operations" className="mb-10 flex items-center gap-2 px-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-lg font-bold text-white">M</span><span className="text-xl font-bold tracking-tight">Mouse<span className="text-cyan-500">AI</span></span></Link><nav className="space-y-1" aria-label="Ana navigasyon">{navItems.map(([label, href, icon], index) => <Link key={label} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${index === 0 ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}><span className="w-5 text-center text-base" aria-hidden="true">{icon}</span>{label}{label === 'Görevler' && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">12</span>}</Link>)}</nav><div className="absolute bottom-6 left-4 right-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">Daha fazlasını başarmaya hazır mısın?</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-3/4 rounded-full bg-blue-500" /></div><p className="mt-2 text-xs text-slate-500">Bu ay 342 görev tamamlandı</p></div></aside>
    <main className="min-h-screen pt-[74px] lg:pl-[228px]">{children}</main>
  </div>;
}

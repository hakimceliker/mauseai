/**
 * Canonical inventory of the official A–Z diagram.
 *
 * tests/diagram/svg-inventory.test.ts parses public/diagrams/masuai-a-z-diyagram.svg
 * and fails if this list and the SVG drift apart (cards, titles, lanes, edges).
 */

export type NodeKind = "strategy" | "process" | "system" | "integration" | "governance";
export type EdgeKind = "sync" | "async";

export interface DiagramNode {
  id: string;
  lane: "lane-1" | "lane-2" | "lane-3" | "lane-4";
  kind: NodeKind;
  title: string;
  /** One entry per capability named on the card (its text lines, split into items). */
  capabilities: string[];
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  /** Solid connectors are request/response flow, dashed ones are async assurance feeds. */
  kind: EdgeKind;
  label: string;
}

export const DIAGRAM_SVG_PATH = "public/diagrams/masuai-a-z-diyagram.svg";
export const DIAGRAM_PUBLIC_URL = "/diagrams/masuai-a-z-diyagram.svg";
/** SHA-256 of the file exactly as uploaded; the visual original must never change. */
export const DIAGRAM_SHA256 = "8d2eb7cf71adeeef2340c26d2ddbe64d7b0ccf42fc027ef2a0152065daf1f7e8";

export const DIAGRAM_TITLE = "MasuAI — A’dan Z’ye Ürün ve Operasyon Mimarisi";
export const DIAGRAM_PRINCIPLE =
  "Akış prensibi: keşfet → bağla → güvenceye al → otomatikleştir → ölç → öğren → ölçekle";

export const DIAGRAM_LANES = [
  { id: "lane-1", title: "1 · STRATEJİ & GİRDİLER" },
  { id: "lane-2", title: "2 · VERİ, BİLGİ & AI ÇEKİRDEĞİ" },
  { id: "lane-3", title: "3 · ÜRÜN YÜZÜ & İŞ AKIŞLARI" },
  { id: "lane-4", title: "4 · GÜVEN, OPERASYON & BÜYÜME" },
] as const;

export const DIAGRAM_NODES: DiagramNode[] = [
  { id: "A", lane: "lane-1", kind: "strategy", title: "A — Amaç & Konumlandırma", capabilities: ["Hedef kullanıcı", "Ana problem", "Değer önerisi", "Başarı tanımı"] },
  { id: "B", lane: "lane-1", kind: "strategy", title: "B — Brief & Gereksinim", capabilities: ["Kullanım senaryoları", "Roller", "Öncelikler", "Kabul kriterleri"] },
  { id: "C", lane: "lane-1", kind: "integration", title: "C — Channels", capabilities: ["Web", "Mobil", "API", "E-posta", "Slack/Teams", "CRM yüzeyleri"] },
  { id: "D", lane: "lane-1", kind: "process", title: "D — Domain Bilgisi", capabilities: ["Sözlük", "Süreçler", "Politika", "Kaynak sahipleri", "Güncellik"] },
  { id: "E", lane: "lane-1", kind: "strategy", title: "E — Etki & KPI", capabilities: ["Zaman tasarrufu", "Doğruluk", "Dönüşüm", "Memnuniyet", "Maliyet"] },
  { id: "F", lane: "lane-1", kind: "process", title: "F — Feedback Döngüsü", capabilities: ["Kullanıcı geri bildirimi", "Etiketleme", "İyileştirme kuyruğu", "İnsan onayı noktaları"] },
  { id: "G", lane: "lane-2", kind: "integration", title: "G — Veri Alımı", capabilities: ["Dosya", "API", "Webhook", "Doküman", "Olay akışı", "Şema + versiyon + sahiplik"] },
  { id: "H", lane: "lane-2", kind: "process", title: "H — Hazırlama", capabilities: ["Temizleme", "Parçalama", "PII maskeleme", "Metadata", "Kalite kapıları", "İzlenebilirlik"] },
  { id: "CORE", lane: "lane-2", kind: "system", title: "MASUAI CORE", capabilities: ["Model yönlendirme", "RAG", "Araç çağrısı", "Prompt politikası", "Hafıza", "Orkestrasyon", "Girdi → bağlam → karar → eylem → kanıt"] },
  { id: "I", lane: "lane-2", kind: "governance", title: "I — İzolasyon", capabilities: ["Tenant sınırları", "RBAC", "Oran limitleri", "Bütçe kontrolü", "Güvenli varsayılanlar"] },
  { id: "J", lane: "lane-2", kind: "process", title: "J — Jeneratif Çıktı Kalitesi", capabilities: ["Kaynak gösterme", "Yapılandırılmış çıktı", "Guardrail", "Düşük güvende eskalasyon"] },
  { id: "K", lane: "lane-3", kind: "system", title: "K — Kullanıcı Deneyimi", capabilities: ["Hızlı başlangıç", "Arama", "Sohbet", "Açıklanabilir sonuç", "Kişisel alan + ekip alanı"] },
  { id: "L", lane: "lane-3", kind: "system", title: "L — Logic & Tools", capabilities: ["İş kuralları", "Fonksiyonlar", "Araç izinleri", "Hata yönetimi", "Her eylem için audit izi"] },
  { id: "M", lane: "lane-3", kind: "process", title: "M — Modüler Akışlar", capabilities: ["Araştır", "Özetle", "Üret", "Onaylat", "Yayınla", "Takip et", "Tekrar kullanılabilir şablonlar"] },
  { id: "N", lane: "lane-3", kind: "integration", title: "N — Notifications", capabilities: ["Görev", "Uyarı", "Özet", "İnsan onayı", "SLA takibi", "Doğru kişiye, doğru zamanda"] },
  { id: "O", lane: "lane-3", kind: "integration", title: "O — Omnichannel", capabilities: ["Web + API + ekip araçları", "Tek kimlik", "Tek bağlam", "Kesintisiz kullanıcı yolculuğu"] },
  { id: "P", lane: "lane-3", kind: "process", title: "P — Pilot → Production", capabilities: ["Küçük kullanıcı grubu", "Güvenlik/kalite kapıları", "Kademeli yaygınlaştırma", "Akış sahibi", "Geri dönüş planı", "Operasyon runbook’u"] },
  { id: "Q", lane: "lane-4", kind: "governance", title: "Q — Quality & Eval", capabilities: ["Altın veri seti", "Regresyon", "İnsan değerlendirmesi", "A/B", "Doğruluk · fayda · gecikme"] },
  { id: "R", lane: "lane-4", kind: "governance", title: "R — Risk & Güvenlik", capabilities: ["Prompt injection", "Veri sızıntısı", "Model kötüye kullanımı testleri", "Politika + olay müdahalesi"] },
  { id: "S", lane: "lane-4", kind: "governance", title: "S — SRE & Maliyet", capabilities: ["Gözlemlenebilirlik", "SLA", "Token/altyapı bütçesi", "Fallback", "Alarmlar", "Kapasite planı"] },
  { id: "T", lane: "lane-4", kind: "governance", title: "T — Takım & Sahiplik", capabilities: ["Ürün, mühendislik, veri, hukuk, destek sorumlulukları", "RACI", "Karar kayıtları"] },
  { id: "U", lane: "lane-4", kind: "governance", title: "U — Uyum & Gizlilik", capabilities: ["Veri sınıfları", "Saklama", "Silme", "Erişim ve denetim", "Privacy by design"] },
  { id: "V-Z", lane: "lane-4", kind: "strategy", title: "V–Z — Yaygınlaştırma ve Büyüme", capabilities: ["V: versiyonla", "W: workflow’ları çoğalt", "X: deneyleri ölç", "Y: kullanıcıyı elde tut", "Z: sürekli öğren, yeni kullanım alanları aç"] },
];

const solid = (from: string, to: string, label: string): DiagramEdge => ({ id: `${from}->${to}`, from, to, kind: "sync", label });
const dashed = (from: string, to: string, label: string): DiagramEdge => ({ id: `${from}->${to}`, from, to, kind: "async", label });

export const DIAGRAM_EDGES: DiagramEdge[] = [
  solid("A", "B", "Amaç, gereksinimleri belirler"),
  solid("B", "C", "Senaryolar ve roller kanalları seçer"),
  solid("C", "D", "Kanal başına bilgi kaynakları bağlanır"),
  solid("D", "E", "Bilgi tabanı KPI tanımını besler"),
  solid("E", "F", "KPI'lar geri bildirim ve onay noktalarını belirler"),
  solid("G", "H", "Alınan veri hazırlamaya girer"),
  solid("H", "CORE", "Hazırlanmış parçalar CORE bağlamına girer"),
  solid("CORE", "I", "CORE kararı izolasyon kapısından geçer"),
  solid("I", "J", "İzin verilen çıktı kalite kapısına gider"),
  solid("CORE", "K", "CORE sonucu kullanıcıya açıklanabilir sunulur"),
  solid("CORE", "L", "CORE araç çağrısı kurallar ve izinlerle yapılır"),
  solid("CORE", "M", "CORE modüler akış şablonlarını çalıştırır"),
  solid("CORE", "N", "CORE olayları bildirim/onay üretir"),
  solid("CORE", "O", "CORE tek kimlik ve bağlamla tüm kanallara hizmet eder"),
  solid("CORE", "P", "CORE özellikleri kademeli yayına bağlıdır"),
  dashed("K", "Q", "Kullanıcı sonuçları değerlendirmeye akar"),
  dashed("L", "R", "Araç eylemleri risk taramasından geçer"),
  dashed("M", "S", "Akış çalıştırmaları SLO ve maliyete yazılır"),
  dashed("N", "T", "Bildirimler RACI sahibine yönlendirilir"),
  dashed("O", "U", "Kanal verisi sınıflandırma ve saklama kurallarına tabidir"),
  dashed("P", "V-Z", "Yayına alınan sürümler versiyonlanır ve büyüme ölçülür"),
];

export function nodeById(id: string): DiagramNode | undefined {
  return DIAGRAM_NODES.find((node) => node.id === id);
}

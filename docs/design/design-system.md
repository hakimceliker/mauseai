# MouseAI Tasarım Sistemi

MouseAI arayüzü **beyaz/şeffaf** bir dil kullanır: beyaz sayfa zemini, slate tonlarında metin ve
arkasını hafifçe gösteren yarı saydam "cam" (glass) yüzeyler.

- **Tek kaynak:** `src/styles/tokens.ts`
- **CSS karşılığı:** `src/app/globals.css` içindeki `:root { --mouse-* }` değişkenleri
- **Senkron testi:** `src/__tests__/design-tokens.test.ts` — her token'ın `:root` içinde aynı
  değerle tanımlı olduğunu ve metin renklerinin WCAG AA kontrastını sağladığını doğrular.

Bir token eklerken veya değiştirirken önce `tokens.ts`'i, ardından `globals.css` içindeki
`:root` bloğunu güncelleyin; test ikisi ayrışırsa kırılır.

## Renk paleti

| Token (TS)      | CSS değişkeni                  | Değer                        | Kullanım |
|-----------------|--------------------------------|------------------------------|----------|
| `bg`            | `--mouse-color-bg`             | `#ffffff`                    | Sayfa zemini |
| `surface`       | `--mouse-color-surface`        | `#f8fafc`                    | Opak yüzey, satır hover |
| `surfaceGlass`  | `--mouse-color-surface-glass`  | `rgba(248, 250, 252, 0.88)`  | Cam kart/panel yüzeyi |
| `border`        | `--mouse-color-border`         | `#e2e8f0`                    | Kenarlık, ayırıcı |
| `textPrimary`   | `--mouse-color-text-primary`   | `#0f172a`                    | Başlık ve gövde metni |
| `textStrong`    | `--mouse-color-text-strong`    | `#1e293b`                    | Alt başlık, etiket |
| `textSecondary` | `--mouse-color-text-secondary` | `#334155`                    | İkincil gövde metni |
| `textMuted`     | `--mouse-color-text-muted`     | `#64748b`                    | Açıklama, meta bilgi, zaman damgası |
| `accent`        | `--mouse-color-accent`         | `#0e7490`                    | Bağlantı, odak, birincil aksiyon |
| `onAccent`      | `--mouse-color-on-accent`      | `#ffffff`                    | Accent zemin üzerindeki metin |
| `success`       | `--mouse-color-success`        | `#047857`                    | Başarılı durum |
| `onSuccess`     | `--mouse-color-on-success`     | `#ffffff`                    | Success zemin üzerindeki metin |
| `warning`       | `--mouse-color-warning`        | `#b45309`                    | Uyarı durumu |
| `onWarning`     | `--mouse-color-on-warning`     | `#ffffff`                    | Warning zemin üzerindeki metin |
| `danger`        | `--mouse-color-danger`         | `#b91c1c`                    | Hata / yıkıcı aksiyon |
| `onDanger`      | `--mouse-color-on-danger`      | `#ffffff`                    | Danger zemin üzerindeki metin |

## Tipografi, boşluk, köşe, gölge, bulanıklık

- **Font:** `--mouse-font-sans` (sistem yazı tipi yığını), `--mouse-font-mono` (kod, ID'ler).
- **Boyut ölçeği:** `--mouse-text-xs` (0.75rem) · `sm` (0.875rem) · `base` (1rem) · `lg` (1.125rem) ·
  `xl` (1.25rem) · `2xl` (1.5rem) · `3xl` (1.875rem).
- **Satır yüksekliği:** `--mouse-leading-tight` 1.25 · `normal` 1.5 · `relaxed` 1.625.
- **Ağırlık:** `--mouse-font-weight-regular` 400 · `medium` 500 · `semibold` 600 · `bold` 700.
- **Boşluk (4px ızgara):** `--mouse-space-0/1/2/3/4/6/8/12` → 0 · 4 · 8 · 12 · 16 · 24 · 32 · 48 px.
- **Köşe yarıçapı:** `--mouse-radius-sm` 4px · `md` 8px · `lg` 12px · `xl` 16px · `full` (hap/avatar).
- **Gölge:** `--mouse-shadow-sm/md/lg` — slate-900 tabanlı, düşük opaklıkta; beyaz zeminde yumuşak derinlik.
- **Bulanıklık:** `--mouse-blur-sm` 4px (Tailwind `backdrop-blur-sm` ile eşdeğer), `--mouse-blur-md` 12px.

## Kullanım kuralları

1. **Ham renk yazmayın.** Yeni CSS'te `#hex`/`rgba()` yerine `var(--mouse-…)` kullanın. TS/inline
   stilde `tokens.ts`'ten içe aktarın veya `cssVar('--mouse-color-accent')` yardımcısını kullanın.
2. **Cam yüzey = `surfaceGlass` + `border` + blur.** Cam paneller her zaman beyaz (`bg`) zeminin
   üzerinde durur; renkli veya fotoğraflı zeminin üzerine cam koymayın — kontrast garantisi bozulur.
3. **Metin hiyerarşisi:** başlık/gövde `textPrimary`, alt başlık `textStrong`, ikincil `textSecondary`,
   yalnızca yardımcı bilgi için `textMuted`. `textMuted` ile uzun paragraf yazmayın.
4. **Durum renkleri anlam taşır:** `success`/`warning`/`danger` yalnızca durum için; dekorasyon için
   `accent` kullanın. Dolgu (badge, buton) kullanırken metin rengi eşleşen `on*` token'ı olmalı.
5. **`.mouseai-light` köprüsü:** Eski koyu tema sınıfları (`text-white`, `bg-slate-900/50` vb.)
   `.mouseai-light` kapsayıcısı altında token'lara yönlendirilir. Yeni bileşenlerde bu sınıflara
   dayanmak yerine doğrudan token kullanın.
6. **Tailwind v4:** `globals.css` başındaki `@tailwind` direktiflerini kaldırmayın veya yerini
   değiştirmeyin; PostCSS `@tailwindcss/postcss` eklentisiyle işlenir.

## Erişilebilirlik

Tüm metin renkleri WCAG 2.x **AA (≥ 4.5:1)** eşiğini hem beyaz zeminde hem de beyaz üzerine
bindirilmiş (opak hale getirilmiş) cam yüzeyde sağlar. Test bu oranları göreli parlaklık
(relative luminance) formülüyle her çalıştırmada yeniden hesaplar.

| Renk            | Beyaz zemin | Cam yüzey (beyaz üzerine) |
|-----------------|-------------|---------------------------|
| `textPrimary`   | 17.85:1     | 17.16:1 |
| `textStrong`    | 14.63:1     | 14.06:1 |
| `textSecondary` | 10.35:1     | 9.95:1  |
| `textMuted`     | 4.76:1      | 4.57:1  |
| `accent`        | 5.36:1      | 5.15:1  |
| `success`       | 5.48:1      | 5.27:1  |
| `warning`       | 5.02:1      | 4.83:1  |
| `danger`        | 6.47:1      | 6.22:1  |

`on*` renkleri (beyaz) kendi dolgu renkleri üzerinde de ≥ 4.5:1 sağlar.

Ek kurallar:

- `textMuted` sınıra yakındır (cam üzerinde 4.57:1); cam opaklığını **0.88'in altına düşürmeyin**
  ve `textMuted`'ı daha açık bir tona çekmeyin.
- Odak halkası `accent` rengiyle, `ring-offset` rengi `bg` ile verilir; odak göstergesini kaldırmayın.
- Durumu yalnızca renkle anlatmayın; ikon veya metin etiketi ekleyin (renk körlüğü).
- `prefers-reduced-motion` açıkken animasyonlar (ör. `fade-in`) kısaltılmalı veya kapatılmalıdır.

## Yap / Yapma

| Yap | Yapma |
|-----|-------|
| `color: var(--mouse-color-text-muted)` | `color: #64748b` |
| Cam paneli beyaz zemin üzerinde kullan | Cam paneli koyu/renkli görsel üzerine koy |
| Dolgu butonda `accent` + `onAccent` | Accent zemin üzerinde `textPrimary` |
| Hata mesajında `danger` + ikon + metin | Hatayı yalnızca kırmızı kenarlıkla belirt |
| Yeni token'ı önce `tokens.ts`'e, sonra `:root`'a ekle | `globals.css`'e tokens.ts'te olmayan `--mouse-*` ekle |
| `textMuted`'ı kısa meta bilgi için kullan | `textMuted` ile uzun gövde metni yaz |
| Boşlukta 4px ızgarayı (`--mouse-space-*`) izle | Rastgele `13px`, `22px` gibi değerler kullan |

# MouseAI GitHub Merkezli Faz ve AI Orkestrasyon Planı v1.0

**Merkez repo:** `https://github.com/hakimceliker/mauseai`

GitHub; kod, branch, issue, PR, Actions kanıtı ve release kaydının merkezi kaynağıdır. Local ve Docker yalnızca geliştirme/doğrulama ortamıdır. Credential'lar GitHub'a yazılmaz.

## Zorunlu iş akışı

`main SHA → görev paketi → ayrı AI branch'i → PR → GitHub Actions → Docker doğrulaması → Claude/QA review → insan onayı → merge → main CI → sonraki faz`

Her AI aynı klasöre paralel yazamaz. Main'e doğrudan push, başka projeye erişim ve kanıt olmadan merge yasaktır.

## Dokuz faz

| Faz | Amaç | Çıkış kanıtı |
|---|---|---|
| 0 | Yönetim ve hazırlık | owner, reviewer, base SHA, kabul kriteri ve kanıt komutu |
| 1 | 14 günlük çekirdek MVP | hedef → task → worker → checkpoint → audit/cost Docker akışı |
| 2 | Platform ve gerçek AI | provider registry, güvenli `not_configured`, staging smoke/e2e |
| 3 | Müşteri operasyonu ve gelir | e-posta → AI → teklif → policy → onay → gönderim → audit/ledger |
| 4 | Uygulama yüzeyleri | web/desktop/mobile/browser aynı görevi gösterir; responsive/a11y geçer |
| 5 | SEO, reklam, tasarım ve medya | araştırma → üretim → review → yayın → ölçüm döngüsü |
| 6 | Multi-tenant, ajans ve marketplace | tenant, ekip, policy ve connector izolasyonu |
| 7 | Enterprise ve özel dağıtım | SSO/SCIM, uyum, SIEM, pentest, backup/DR |
| 8 | Otonom işletim ve küresel ölçek | kalite, maliyet, güvenlik ve kapasite KPI'ları hedefte |

## AI sahipliği

- **GPT/Codex/Cursor:** kod, migration, test ve uygulama PR'ı.
- **Claude:** mimari, güvenlik, tenant, secret, retry ve idempotency incelemesi; approve/changes requested/blocked.
- **Codex Integrator:** branch, Docker, conflict, test ve release kanıtı.
- **Research/Docs AI:** araştırma, connector sözleşmesi, belge ve diyagram.
- **UI/Design AI:** referans ekranları, responsive, a11y ve görsel test.
- **QA/Security AI:** negatif test, secret scan, diff ve risk raporu.

## Zorunlu görev paketi

Her görevde görev ID/faz, owner/reviewer, repo/base SHA, branch, kapsam, bağımlılık, kabul kriterleri, test komutları, risk/credential durumu, üretilecek PR/kanıtlar ve sonraki sahip bulunur.

## Kapılar

| Kapı | Kanıt | Başarısızsa |
|---|---|---|
| G0 | repo, branch, base SHA, scope | görev durur |
| G1 | secret scan, tenant sınırı, diff scope | PR bloke |
| G2 | unit, typecheck, lint | PR bloke |
| G3 | Docker Postgres/Inngest integration | PR bloke |
| G4 | build, audit, API/visual smoke | PR bloke |
| G5 | Claude/QA review | changes requested |
| G6 | insan onayı ve merge | beklemede |
| G7 | main CI ve release evidence | release durur |

Ödeme, canlı mesaj, deploy, service-role, secret ve veri silme işlemleri L3/L4 onayı olmadan çalıştırılamaz. Yeni araç önce `planned`, doğrulandıktan sonra `connected` olur.

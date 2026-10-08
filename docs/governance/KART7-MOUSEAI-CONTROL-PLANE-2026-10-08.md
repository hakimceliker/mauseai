# Kart 7 — MouseAI Control Plane Adapter

Tarih: 2026-10-08
Canonical repo: `https://github.com/hakimceliker/mauseai`
Project ID: `mauseai`

## Uygulanan yerel kapsam

- `src/lib/integrations/senatech-control-plane-adapter.ts` eklendi.
- Adapter yalnız `task_execute`, `task_review` ve `task_summary` görevlerini kabul eder.
- Tenant kimliği trusted caller’dan, request ID çağrı bağlamından alınır ve ikisi de doğrulanır.
- `local_only=true`, `allow_cloud=false`, `shadow_only=true` sabitleri envelope’a yazılır.
- Ödeme, rezervasyon, finansal ve trading eylemleri adapter’a girmeden reddedilir.
- Transport varsayılan olarak yoktur; açıkça inject edilmeden ağ çağrısı yapılmaz.
- Request ID mismatch, tamamlanmamış veya doğrulanmamış yanıt fail-closed reddedilir.

## Bağlantı politikası

Bu adapter MouseAI’nin mevcut task/Inngest akışını varsayılan olarak değiştirmez. Gerçek Control Plane transport’u, authenticated tenant context’i, audit/ledger ve worker kanıtı hazır olduğunda trusted caller tarafından açıkça bağlanmalıdır. Bu commit tek başına gerçek provider, Supabase, Inngest veya Control Plane kabulü değildir.

## Yerel kabul

- Adapter testleri: 4 test.
- Canonical repo kalite kapıları: lint, typecheck, 31 test dosyası / 276 başarılı test / 16 skip, production build başarılı.

## Kalan fiziksel kanıt

- Authenticated tenant A/B negatif testi.
- Gerçek Inngest trigger, worker, checkpoint, retry ve idempotency izi.
- Gerçek provider credential veya açık `credential_not_configured` kanıtı.
- Aynı request için audit/cost ledger satırlarının uzlaştırılması.
- Merge/PR/CI ve production deployment kanıtı.

# Supabase migration sırası

Migration dosyaları dört haneli önekle artan sırada uygulanır. `0007` numarası kullanılmamıştır; sıralama boşluğu kasıtlıdır ve eski bir migration numarasını yeniden kullanmak yasaktır.

```text
0001_core.sql
0002_idempotency.sql
0003_supabase_auth_mapping.sql
0004_auth_tenant_resolution_alignment.sql
0005_wallet_ledger.sql
0006_harden_function_grants.sql
0008_private_tenant_resolver.sql
0009_foreign_key_indexes.sql
0010_remaining_fk_indexes_and_rls_initplan.sql
```

Canlı Supabase projesine migration uygulamak bu depodan otomatik yapılmaz. Uygulama, kullanıcı tarafından onaylanmış production projesinde ve Supabase migration mekanizmasıyla gerçekleştirilir. Anahtar veya production verisi depoya yazılmaz.

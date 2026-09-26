# MouseAI — RLS Performans ve Edge Function Güvenlik Standardı

## 1. RLS performans kuralları

1. Her `tenant_id` kolonu index’lenir.
2. Task listelerinde `tenant_id`, `status` ve `created_at` filtreleri birlikte kullanılır.
3. `current_tenant_id()` stable/security-definer helper olarak kullanılır ve `search_path = public` içerir.
4. `current_user_role()` yalnızca yazma, güncelleme veya silme gibi yetki gerektiren policy’lerde kullanılır.
5. Join’li ve satır başına pahalı subquery içeren policy’lerden kaçınılır.
6. `created_by` ile filtrelenen task sorguları için `idx_tasks_created_by` kullanılır.
7. Büyük tablolar için aktif task partial index’i korunur.
8. Gün 12 ve sonrasında `EXPLAIN ANALYZE` ile kritik sorgular periyodik ölçülür.

### Kritik sorgu kontrolü

```sql
explain analyze
select * from public.tasks
where tenant_id = public.current_tenant_id()
  and status = 'running'
order by created_at desc;
```

Beklenen sonuç: uygun index/bitmap scan. Sequential scan tespit edilirse tenant verisi büyümeden index veya sorgu yeniden değerlendirilir.

## 2. Edge Function güvenlik standardı

Edge Function kullanıma açıldığında her function aşağıdaki sırayı uygulamak zorundadır:

1. HTTP method kontrolü
2. Authorization header kontrolü
3. JWT doğrulama
4. Zod/schema input doğrulaması
5. Kullanıcı profilinden tenant ve rol kontrolü
6. RLS bağlamında veri sorgusu
7. Hassas veri içermeyen cevap
8. Redacted güvenlik logu

### Zorunlu kurallar

- Service role yalnızca Edge Function/worker server-side içinde kullanılabilir.
- Service role key client’a veya response’a dönülemez.
- Token, parola, secret ve tam müşteri body’si loglanamaz.
- Production CORS wildcard (`*`) kullanılamaz; allowlist gerekir.
- Hardcoded secret yasaktır; Vault veya environment secret kullanılır.
- RLS kapatılamaz.
- Input validation olmadan database write yapılamaz.
- Edge Function görevi tenant kapsamı olmadan çalıştırılamaz.

## 3. Gün 12 test kapıları

- [ ] JWT olmadan Edge Function 401 döndürüyor.
- [ ] Geçersiz body 400 döndürüyor.
- [ ] Başka tenant task’ı 404/403 döndürüyor.
- [ ] Service role değişkeni public bundle’da yok.
- [ ] Token ve secret loglarda yok.
- [ ] Production CORS allowlist ile sınırlı.
- [ ] RLS helper fonksiyonlarının search path’i sabit.
- [ ] Kritik sorgular index kullanıyor.

## 4. Kapsam durumu

Edge Function’lar Faz 2’de webhook ve yardımcı iş akışları için açılacaktır. MVP’de API Route Handler + Inngest worker kullanılır; bu standarda uymayan yeni Edge Function kabul edilmez.

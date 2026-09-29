# MouseAI — Inngest Step Idempotency Kararı

## Uygulanan karar

- Inngest event adı mevcut production akışında `task.execute` olarak kullanılır.
- `mouseai/task.created` eski, kayıt dışı worker sözleşmesidir; yeni production trigger’larında kullanılmaz.
- MVP worker’daki gerçek step kimliği UUID `steps.id`’dir.
- Deterministik Inngest step ID formatı: `step-{taskId}:{stepId}:{attempt}`.
- MVP’de tek yürütme adımı için `attempt = 1`; bilinçli yeniden deneme yeni attempt ile açılır.
- `steps(task_id, node_id, attempt)` üzerinde unique index vardır.
- `checkpoints(task_id, step_id, version)` üzerinde unique index vardır.
- Checkpoint yazımı upsert ile korunur.
- Dış yan etkiler, tamamlanmış step/DB kontrolünden sonra çalıştırılır.

## Uyumsuz öneriler uygulanmadı

- `task/run` event’i: mevcut event sözleşmesi bozulmaması için kullanılmadı.
- `step_id text = nodeId`: mevcut migration `steps.id uuid` kullandığı için uygulanmadı.
- `workflow_id` olmayan step insert’i: mevcut şemada zorunlu olduğu için uygulanmadı.

## Sonuç

Inngest replay/retry ve manuel resume aynı task/step kaydına geldiğinde deterministik step ID, DB unique constraint ve checkpoint upsert birlikte yan etki tekrarını engeller.

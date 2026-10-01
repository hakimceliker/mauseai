# MAUSEAI Source Register and Variance Record

**Record:** `SRC-CR-001`  
**Recorded:** 2026-10-01  
**Scope:** User-supplied governance, decision-model and data-request documents  
**Status:** Sources hashed and compared; version/byte variances are recorded for owner review
**Canonical record:** [`MAUSEAI_Ana_Kayit.json`](MAUSEAI_Ana_Kayit.json)

This record registers the supplied source bytes without copying the PDFs or
overwriting earlier records. SHA-256 and byte counts below were verified from
the supplied attachment files. An identical hash means the received file is
already represented by that source ID; it is not added a second time.

## Authority and use

The source texts establish these scopes:

1. `ST_Ana_Kanun_v3.6.pdf` is the upper/cross-project law.
2. `Senatech_Proje_Uretim_ve_Isletme_Kanunu_v3.0.pdf` is a binding general
   production/operations standard. Its v3.0 filename/v3.2 body variance is
   recorded, not silently normalized.
3. `MAUSEAI_Master_Kanun_ve_Sartname_v1.0.pdf` is the binding MouseAI-specific
   adaptation under the upper ST law. It governs MouseAI-specific requirements
   over earlier MouseAI technical specifications. If it conflicts with the
   Senatech general law, record the conflict for an authorized decision rather
   than inferring precedence.
4. Earlier MouseAI technical specifications are subordinate to the upper law
   and the applicable MouseAI adaptation.
5. The project-decision JSON is canonical for that decision model. Its PDF and
   Markdown are derived exports, not independent decision sources.
6. The data-request workbook and closure report are inputs/status records;
   neither constitutes implementation, live acceptance, profitability, or a
   passed gate.
7. The 30-row source acceptance CSV remains the source plan. The 52-row
   repository acceptance register is its tracked work view with the 22
   adaptation rows added; it retains all 30 PLAN IDs and their source status
   values.

The project lifecycle remains 17 stages, the five required models, A–L work
breakdown and G0–G12. P0–P9 are product/technical packages, not replacements
for the strategic A–H path or gate decisions. G10 is technical publication,
G11 is sale or authorized internal use, and G12 is sustainable operation.
Neither the 377-control inventory nor a completed document package proves a
runtime or acceptance result.

## Registered sources

| ID | Delivered file | Bytes | SHA-256 | Version/title observed | Role / precedence |
|---|---|---:|---|---|---|
| SRC-01 | `ST_Ana_Kanun_v3.6.pdf` | 4,175,048 | `d769915bb442b024e20644c1096e11c0a5b468f663848046114bce710105e073` | Filename and active outer header v3.6; cover metadata and opening guide say v3.4 | Existing upper law; exact-byte match to existing SRC-01 |
| SRC-02 | `03-MAUSEAI_Master_Kanun_ve_Sartname_v1.0.docx` | 1,080,392 | `1b20a1ff7f23091f811a50fa88eebcc1a72a7b08473d04f97436fe96a1ea763b` | Previously registered DOCX | Preserve as prior source; not replaced by the supplied PDF |
| SRC-03 | `02-MAUSEAI_Diyagram_Atlasi_v1.0.html` | 523,569 | `435388c1b24465db1aebed2dc658e175d7b5fb1d01123f4b35c065872f3b852b` | Previously registered atlas | Supporting diagrams; not a gate result |
| SRC-04 | `MAUSEAI_Eksikler_ve_Kabul_Plani_v1.0.csv` | 5,580 | `6b906af6d6d747c8714c1ce38bc5d79cb3d59db4c648e3e92e7e6d4677fe495b` | 30 source PLAN rows | Exact-byte match to existing SRC-04; no duplicate source or issues |
| SRC-05 | `MAUSEAI_Master_Kanun_ve_Sartname_v1.0.pdf` | 3,563,460 | `6672c3df336da68e15eff53b94a554a5004eb84d66672deb3a43619dbf16ba04` | Filename v1.0; body says ST v3.6 adaptation revision 01 | New supplied MouseAI adaptation PDF; separate from prior same-named manifest artifact |
| SRC-06 | `Senatech_Proje_Uretim_ve_Isletme_Kanunu_v3.0.pdf` | 3,742,400 | `e4a31b22c8c67db7286d719b28361c607bebddff28183483f11a44c48eb121f0` | Filename v3.0; body/active PUK-001 says v3.2 | Binding general production/operations law; filename/body variance retained, not renamed |
| SRC-07 | `Proje_Fikri_Arastirma_ve_Yatirim_Karar_Modeli.json` | 27,299 | `a5fbc294e5ca46bcf5de2d88132d73a6b4d303d78fe9d5f286bfd7ba8720356a` | v1.0, 2026-10-01 | Canonical decision-model source; status says runtime not implemented |
| SRC-08 | `ST_Proje_Veri_Talep_Formu.xlsx` | 31,252 | `7998eceb100904bf127e3a9dd59a04c18f236d33b0b00c39fbac95a97f592a37` | Workbook with five data-request sheets | Data-request template; values remain unprovided/`VERİ BEKLENİYOR` |
| SRC-09 | `ST_Nihai_Projeksiyon_Kapanis_Raporu.pdf` | 74,462 | `008473c4e6fc474b79d1d90ed22f6827e1bf4c393aa13fc72eedad75462c5c1a` | ST v3.6 / Revizyon 04, 2026-10-01 | Documentation/projection closeout only; explicitly not product/live/profitability acceptance |

### Derived exports of SRC-07

| File | Bytes | SHA-256 | Authority |
|---|---:|---|---|
| `Proje_Fikri_Arastirma_ve_Yatirim_Karar_Modeli.pdf` | 93,473 | `16e319f70f29d2aa9f1fd46649e4417fcbfe197d44e5450ffc9e3f941557fb21` | Derived PDF; SRC-07 JSON remains canonical |
| `Proje_Fikri_Arastirma_ve_Yatirim_Karar_Modeli.md` | 19,660 | `08a8d199a762ff36416e11e61c129369899761c45bc8162f9d44eb30fe8c2a77` | Derived Markdown; SRC-07 JSON remains canonical |

The working 52-row acceptance CSV is **20,739 bytes**, SHA-256
`2822779b9d07815166edf28007e5949c6f753af1101e66ae8ab04056d58c2fd9`.
It contains PLAN-001–PLAN-030 plus MAU-ADAPT-001–MAU-ADAPT-022. Each shared
PLAN ID has the same `Durum` value as SRC-04. Both files are retained in their
respective roles; the working CSV was not rewritten.

## Repository counterpart and verification result

The source files were available as user-supplied attachments and their byte
counts/hashes were verified before this record was created. The repository
tracks the hashes and roles in `MAUSEAI_Ana_Kayit.json` and this record; it
does not copy every source binary. `SOURCE_MISSING` below means the raw source
binary is not in Git, not that the supplied attachment was unavailable.

| Source | Repo counterpart | Repo hash/result | Version result |
|---|---|---|---|
| SRC-01 ST law PDF | `MAUSEAI_Ana_Kayit.json` SRC-01; metadata only | `SOURCE_MISSING` raw PDF; supplied bytes match the prior SRC-01 hash | `SOURCE_MISMATCH` inside PDF: active v3.6 vs cover/guide v3.4; not normalized |
| SRC-02 earlier MouseAI DOCX | Ana record SRC-02 and `MAUSEAI_Dosya_Manifestosu.json` entry of same basename | `SOURCE_MISMATCH`: Ana record 1,080,392 bytes / `1b20…`; package manifest 1,560,563 bytes / `62b479…`; raw DOCX not copied | Same display version v1.0 does not establish same source bytes |
| SRC-03 diagram atlas HTML | Ana record SRC-03; metadata only | `SOURCE_MISSING` raw HTML | v1.0 as supplied; supporting artifact, not acceptance |
| SRC-04 30-row acceptance CSV | Ana record SRC-04; work view `MAUSEAI_Eksikler_ve_Kabul_Plani_v1.0.csv` | `SOURCE_MISMATCH` at file level: source 5,580 bytes / `6b906a…`; work view 20,739 bytes / `282277…`; 30 shared PLAN IDs retain the source `Durum` values | 30-row source preserved as metadata; 22 adaptation rows are repository work view only |
| SRC-05 supplied MAUSEAI master PDF | Ana record SRC-05 and this variance record; earlier same-name manifest artifact | `SOURCE_MISMATCH`: supplied 3,563,460 bytes / `6672c3…`; earlier artifact 3,538,359 bytes / `58791c…`; supplied PDF binary not copied | Both say v1.0; do not infer a semantic version increment |
| SRC-06 Senatech production/operations law PDF | Ana record SRC-06; metadata only | `SOURCE_MISSING` raw PDF | `SOURCE_MISMATCH`: filename v3.0 vs active PUK-001/body v3.2 |
| SRC-07 decision-model JSON | Ana record SRC-07; JSON not copied | `SOURCE_MISSING` raw JSON | v1.0 JSON remains canonical; accompanying PDF/MD are derived, not independent authority |
| SRC-07-PDF decision-model PDF export | Source register only; PDF not copied | `SOURCE_MISSING` raw PDF; attachment 93,473 bytes / `16e319f70f29d2aa9f1fd46649e4417fcbfe197d44e5450ffc9e3f941557fb21` | Derived export; JSON SRC-07 remains canonical |
| SRC-07-MD decision-model Markdown export | Source register only; Markdown not copied | `SOURCE_MISSING` raw Markdown; attachment 19,660 bytes / `08a8d199a762ff36416e11e61c129369899761c45bc8162f9d44eb30fe8c2a77` | Derived export; JSON SRC-07 remains canonical |
| SRC-08 project data-request XLSX | Ana record SRC-08; workbook not copied | `SOURCE_MISSING` raw workbook | Five-sheet input template; no version label established; requested values are unprovided |
| SRC-09 projection closeout PDF | Ana record SRC-09; PDF not copied | `SOURCE_MISSING` raw PDF | Documentation/projection closeout only; no product/live/profitability acceptance |

The repository binary for SRC-04 is the expanded working register, not the
30-row attachment. No raw source binary was overwritten. Full values, hashes,
byte counts, and both historical DOCX/PDF identities remain in the source
tables above and in `MAUSEAI_Ana_Kayit.json`.

## Open source variances and disposition

| Variance | Evidence | Disposition |
|---|---|---|
| Supplied master PDF differs from prior same-named manifest artifact | Prior manifest: 3,538,359 bytes, SHA-256 `58791cf450f299db97dd96e7299c7892bf5d8f2492f42c1bd2de2fc94ce6fe54`; supplied SRC-05 has different size/hash | Register SRC-05 as a distinct received source version. Keep prior manifest hash; do not overwrite or claim semantic version change without owner decision. |
| ST active v3.6 header vs v3.4 cover/guide | Same bytes as existing SRC-01; PDF header and closure identify v3.6 while cover metadata/opening guidance identify v3.4 | Preserve source filename and bytes; record the discrepancy. Use the explicitly active v3.6 adaptation statement as recorded by the supplied MouseAI master, pending owner resolution of the source metadata. |
| Senatech filename v3.0 vs PUK-001 body v3.2 | SRC-06 file name says v3.0; internal title/active clauses state v3.2 | Register both labels verbatim. Do not rename, normalize, or silently choose a new version label. |
| Earlier master DOCX metadata differs across repository records | Ana record SRC-02: 1,080,392 bytes/hash `1b20…`; package manifest DOCX: 1,560,563 bytes/hash `62b479d25b69a1ec965bdebc63fd83c000e577b636e644f282bf5a447a93540a` | Preserve both prior byte identities as historical entries; do not infer they are identical to SRC-05 or to each other. |
| Source 30-row CSV vs expanded work register | SRC-04: 30 PLAN rows, 5,580 bytes; repository work register: 52 rows, 20,739 bytes | Keep all PLAN IDs and status values; retain 22 adaptation rows. No duplicate GitHub issues are created by this reconciliation. |

The source binaries are not copied into the repository: the existing manifest
is a package inventory, and the supplied files' hashes, sizes, identities and
roles are registered here and in the main record. This preserves provenance
without duplicating large PDFs. The manifest retains its package-inventory
scope; the main record registers the new metadata-only source identities.

## Acceptance boundary and outstanding blockers

- G0 remains `PENDING_USER_CONFIRMATION`; this record does not assign a sponsor,
  cost owner, or operations risk owner.
- Auth/RLS A/B tests, production Inngest workflow, provider runtime proof,
  idempotency/recovery/verifier evidence, two real pilots, finance/KPI inputs,
  legal review, and G10–G12 acceptance remain open as recorded in the status
  and gap registers.
- Missing approved test accounts, workflow IDs, gateway/provider access, and
  financial/project inputs remain `BLOCKED`, `NOT_RUN`, `VERİ YOK`, or
  `KARAR BEKLİYOR`. No secret is requested, stored, or included here.
- This source reconciliation is not implementation evidence, a passed gate, or
  a production acceptance.

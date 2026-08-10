# 04-visual/ — Visual Template Library (v3.0)

**Metadata only** (registry + previews + docs). Code lives at `remotion-composer/shared/`.

## Cấu trúc

```
04-visual/                          ← metadata (registry, previews, docs)
├── registry.json                   # 24 layouts, mỗi cái có 5 variant pools
├── README.md                       # file này
└── previews/                       # PNG per layout + palette + texture

remotion-composer/shared/  ← CODE (single source of truth)
├── primitives.tsx                  # engine (PaperBg, Cutout, PushIn, ItemText...)
├── types.ts                        # Scene + Item + Palette types
└── layouts/                        # mỗi layout = 1 file .tsx độc lập
    ├── photo-left.tsx              # sửa file này KHÔNG ảnh hưởng file khác
    ├── grid-2x2.tsx
    ├── hero-only.tsx
    └── ... (17 files)
```

## Tách bạch code

- Mỗi layout = **1 file riêng** trong `shared/layouts/`. Sửa `grid-2x2.tsx` không đụng `hero-only.tsx`.
- Primitives (engine) = **1 file** `shared/primitives.tsx`. Sửa primitive = ảnh hưởng mọi layout (cố ý — engine dùng chung).
- Registry = **metadata only** trong `libraries/04-visual/registry.json`. Không chứa code.

## Khi nào cần database (public web / >100 items)

Hiện tại: file-based JSON (MVP — 1 user, local dev, <100 items). Khi:
- >100 layouts → registry.json phình → cần SQLite + pagination
- Public web → cần auth + rate limit + S3 cho previews
- Multi-user → cần locking (file-based race condition)

**Thiết kế data layer abstraction** để swap file → database dễ:
```
layout-lab/src/data/
├── data-source.ts    # interface: getRegistry(), vote(), selectVariant()
├── file-source.ts    # hiện tại: read/write JSON
└── db-source.ts      # tương lai: SQLite/Postgres (khi cần)
```

## TODO

- [ ] Tạo data-source abstraction (file → db swap path)
- [ ] Sync registry IDs ↔ layout filenames (iceberg-reveal.tsx vs bottom-up-reveal ID)
- [ ] Render preview cho 3 layout draft còn lại (triptych, quote-card, timeline-strip)
- [ ] Build Storyboard script
- [ ] Build Planner page (scene → layout dropdown)


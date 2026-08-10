# Library Protocol — pattern chung cho mọi nhánh

Mỗi nhánh trong `libraries/` tuân thủ đúng protocol này. Không ngoại lệ.

## Cấu trúc chuẩn (mọi nhánh)

```
NN-name/
├── registry.json     # INDEX: id, name, status, tags, votes, used_in[], preview, provenance
├── <thành phần>/     # mỗi mục = 1 file độc lập (layout / framework / voice / ...)
├── previews/         # nơi xem nhanh (PNG cho visual, text mẫu cho script/framework)
└── README.md         # luật riêng nhánh + cách thêm + cách video tiêu thụ
```

## registry.json — schema chung

```json
{
  "version": "1.0",
  "items": [
    {
      "id": "photo-left",
      "name": "Photo Left + Text Right",
      "category": "layout",
      "tags": ["photo", "split", "editorial"],
      "status": "approved",
      "votes": { "up": 1, "down": 0 },
      "preview": "previews/photo-left.png",
      "used_in": ["sanderson-laws"],
      "provenance": { "source": "ported from subtext VoxScenes v10", "date": "2026-08-04" },
      "notes": "cutout 56% left + plaque text right"
    }
  ]
}
```

## Vòng đời (status)

| Status | Ý nghĩa | Ai chuyển |
|---|---|---|
| `draft` | mới thêm, chưa duyệt | agent tạo |
| `approved` | user đã ✅ — production được dùng | user duyệt |
| `demoted` | user ❌ 2 lần — KHÔNG dùng nữa | user / auto (sau 2 down votes) |
| `archived` | lỗi thời / thay thế | agent |

## Quy tắc

1. **Thêm mục = 1 file mới + 1 dòng registry** — không sửa file khác.
2. **Production chỉ đọc `status: "approved"`** — generator/scene-plan không pick draft/demoted.
3. **Preview bắt buộc trước duyệt**: mỗi mục phải có preview (PNG cho visual, text cho script) trước khi user đánh giá.
4. **Provenance bắt buộc**: nguồn (research / ported / user-designed), ngày, dùng ở video nào.
5. **Votes nuôi ngược**: user ✅/❌ trên preview → registry cập nhật → generator ưu tiên up votes, né down.
6. **Versioning**: sửa mục = bump version trong registry + ghi changelog; video pin version cụ thể để không break khi library update.

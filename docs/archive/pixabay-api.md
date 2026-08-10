# Pixabay API Reference — for agent use

> Source: https://pixabay.com/api/docs/ | Saved: 2026-07-28
> Free API. Search and retrieve royalty-free images and videos under Pixabay Content License.

## Rate Limit
- **100 requests per 60 seconds** (per API key, not IP)
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Cache results for 24h. No systematic mass downloads.

## Search Images (the one we use)

```
GET https://pixabay.com/api/
```

### Parameters

| Param | Required | Values | Default | Notes |
|-------|----------|--------|---------|-------|
| `key` | **yes** | string | — | Get from pixabay.com after signup |
| `q` | no | string (≤100 chars, URL-encoded) | all images | e.g. `yellow+flower` |
| `lang` | no | `cs,da,de,en,es,fr,id,it,hu,nl,no,pl,pt,ro,sk,fi,sv,tr,vi,th,bg,ru,el,ja,ko,zh` | `en` | |
| `image_type` | no | `all`, `photo`, `illustration`, `vector` | `all` | **Use `illustration` for hand-draw style** |
| `category` | no | `backgrounds,fashion,nature,science,education,feelings,health,people,religion,places,animals,industry,computer,food,sports,transportation,travel,buildings,business,music` | all | |
| `orientation` | no | `all`, `horizontal`, `vertical` | `all` | |
| `colors` | no | `grayscale,transparent,red,orange,yellow,green,turquoise,blue,lilac,pink,white,gray,black,brown` | — | comma-separated |
| `editors_choice` | no | `true`, `false` | `false` | |
| `safesearch` | no | `true`, `false` | `false` | |
| `order` | no | `popular`, `latest` | `popular` | |
| `page` | no | int | `1` | |
| `per_page` | no | `3`–`200` | `20` | |
| `min_width` | no | int | `0` | |
| `min_height` | no | int | `0` | |
| `id` | no | string | — | Get single image by ID |

### Command-line example

```bash
curl "https://pixabay.com/api/?key=${KEY}&q=iceberg&image_type=illustration&per_page=5"
```

### Response (JSON)

```json
{
  "total": 4692,
  "totalHits": 500,
  "hits": [{
    "id": 195893,
    "type": "photo",
    "tags": "blossom, bloom, flower",
    "pageURL": "https://pixabay.com/en/blossom-bloom-flower-195893/",
    "previewURL": "..._150.jpg",
    "webformatURL": "..._640.jpg",
    "largeImageURL": "..._1280.jpg",
    "imageWidth": 4000,
    "imageHeight": 2250,
    "imageSize": 4731420,
    "views": 7671,
    "downloads": 6439,
    "likes": 5,
    "comments": 2,
    "user_id": 48777,
    "user": "Josch13",
    "userImageURL": "..."
  }]
}
```

### Full-resolution / vector access (requires approved account)
These keys only appear with full API access:
- `fullHDURL` — max 1920px
- `imageURL` — original resolution
- `vectorURL` — **SVG download URL (what we want!)**

Apply for full access at the API docs page after registering.

## Key rules
- **Do NOT hotlink** — download images to local/server, don't use Pixabay URLs permanently in your app.
- **Show attribution** ("Images from Pixabay") when displaying search results — appreciated not legally required for Content License.
- **Cache for 24h** minimum.
- Rate limits per API key, not per IP.

## License (simplified)
- **CC0** for content published before Jan 9, 2019 — public domain, no attribution, commercial OK.
- **Pixabay Content License** for content after Jan 9, 2019 — royalty-free, worldwide, perpetual, non-exclusive. Commercial use OK. No attribution required. Cannot re-sell images standalone. Full terms: https://pixabay.com/service/terms/

# Backend endpoints this frontend needs

Nothing in this document exists in the deployed backend today. I verified that
against `https://forgex-website.onrender.com` on 4 Nov 2026: products still carry
`category` as a string enum (`"ATTAR"`, `"PERFUME"`, `"HANDICRAFT"`), and there is
no category or banner resource of any kind.

Per the brief, I wrote no backend code for this. The frontend calls these paths and
degrades quietly until they answer.

---

## Why these paths, not the ones in the brief

The brief asked for `GET /api/categories`. That path would return **401**.
`WebSecurityConfig` ends in `anyRequest().authenticated()` and only `/api/public/**`
is `permitAll`. So public reads must live under `/api/public/`. Admin writes under
`/api/admin/` are already covered by `.requestMatchers("/api/admin/**").hasRole("ADMIN")`.

| Brief | Actually used | Why |
|---|---|---|
| `GET /api/categories` | `GET /api/public/categories` | `/api/public/**` is the only permitAll prefix |
| `GET /api/categories/{id}` | `GET /api/public/categories/{id}` | same |
| `GET /api/categories/{slug}/products` | `GET /api/public/categories/{slug}/products` | same |
| `POST/PUT/DELETE /api/admin/categories` | unchanged | already matches `hasRole("ADMIN")` |

---

## 1. Categories

### `GET /api/public/categories`
No auth. Active categories only, ordered by `sortOrder` then `name`.

```json
[{
  "categoryId": 1,
  "name": "Perfumes",
  "slug": "perfumes",
  "description": "Modern compositions made for unforgettable presence.",
  "imageUrl": null,
  "active": true,
  "theme": "light",
  "sortOrder": 1,
  "legacyCode": "PERFUME",
  "productCount": 24,
  "createdAt": "2026-01-01T00:00:00",
  "updatedAt": "2026-01-01T00:00:00"
}]
```

**`legacyCode` is the one field that is not obvious, and it is load-bearing.**
It holds the old enum name (`PERFUME`, `ATTAR`, `HANDICRAFT`) for the three
categories that already exist, and `null` for anything an admin creates later.
The frontend uses it to decide which dependent fields a product form shows:

- `HANDICRAFT` → show Material (Brass / Copper / Others)
- `ATTAR` or `PERFUME` → show "For" and Fragrance family
- `null` → show neither, because none of them apply to a Home Decor or Gift Items product

It is deliberately not the slug. Slugs are admin-editable, and matching on one would
break the moment someone renames a category. `legacyCode` is set once, by migration,
and never edited through the admin UI.

### `GET /api/public/categories/{slug}/products`
No auth. Paged exactly like `/api/public/products` — same `ProductResponse` envelope
(`content`, `pageNumber`, `pageSize`, `totalElements`, `totalPages`, `lastPage`).
Query params: `pageNumber`, `pageSize`, `sortBy`, `sortOrder`.

### `GET /api/public/categories/{id}`
No auth. One `CategoryDTO`.

### `GET /api/admin/categories`
ADMIN. Every category including inactive ones, each with `productCount`.

### `POST /api/admin/categories`
ADMIN. Body: `name`, `slug`, `description`, `imageUrl`, `active`, `theme`, `sortOrder`.
Returns 201 and the created `CategoryDTO`.
Reject a duplicate name or slug with **400** and `{"message": "...", "status": false}` —
the admin UI shows `message` verbatim.
`legacyCode` is never accepted from the client.

### `PUT /api/admin/categories/{id}`
ADMIN. Same body. Returns the updated `CategoryDTO`.

### `DELETE /api/admin/categories/{id}?reassignTo={otherId}`
ADMIN. **Must never delete products.**
- Category holds no products → delete, return `{"message": "...", "status": true}`.
- Holds products and no `reassignTo` → **400**, with a message naming the count.
  The UI relies on this refusal and then asks the admin where the products should go.
- Holds products with `reassignTo` → move them, then delete the category.

---

## 2. Product DTO additions

`ProductDTO` needs three more fields so products can be read and written by category:

| Field | Direction | Notes |
|---|---|---|
| `categoryId` | read + write | the category this product belongs to |
| `categoryName` | read only | convenience for admin tables |
| `categorySlug` | read only | used to build storefront links |

`category` (the existing enum) **must keep working and keep being sent**. The frontend
still reads it, and the admin product form falls back to it entirely when the category
API is unreachable. On write, `categoryId` should win, with the enum kept in step:

| Request sends | `category_id` | `category` (enum) |
|---|---|---|
| `categoryId` of Attars | Attars | `ATTAR` |
| `categoryId` of a new category | that category | `null` |
| only `category: "PERFUME"` | Perfumes, by `legacyCode` | `PERFUME` |
| neither | unchanged | unchanged |

---

## 3. Banners

Nothing for banners exists at all — no entity, table, repository or controller.

### `GET /api/public/banners`
No auth. Only banners that are switched on **and** inside their date window, ordered by
`sortOrder`. Returning `[]` is correct and expected; the homepage then keeps its
current hero exactly as it is today.

```json
[{
  "bannerId": 1,
  "title": "The season of oud",
  "subtitle": "Smoke, resin and warm amber.",
  "imageUrl": "https://res.cloudinary.com/.../banner-oud.webp",
  "mobileImageUrl": null,
  "ctaLabel": "Shop the edit",
  "ctaUrl": "/collections/oud",
  "sortOrder": 1,
  "startsAt": null,
  "endsAt": null,
  "active": true
}]
```

`mobileImageUrl` is optional; the slider falls back to `imageUrl`.
`ctaLabel` and `ctaUrl` are either both set or both null.

### `GET /api/admin/banners`
ADMIN. Every banner, including off and scheduled ones.

### `POST /api/admin/banners` · `PUT /api/admin/banners/{id}`
ADMIN. Body is the DTO without `bannerId`. `title` and `imageUrl` are required.

### `DELETE /api/admin/banners/{id}`
ADMIN. Returns `{"message": "...", "status": true}`.

### Suggested entity

```
id, title, subtitle, imageUrl, mobileImageUrl,
ctaLabel, ctaUrl, sortOrder, startsAt, endsAt, active,
createdAt, updatedAt
```

---

## 4. A generic image upload (missing, and worth adding)

The only upload endpoint today is `PUT /api/admin/products/{productId}/image`, which
needs a product that already exists. Categories and banners have no product to hang an
upload on, so **both currently take a URL typed into a text field** — with a live
preview, but the admin has to host the image elsewhere first.

To make them first-class, one endpoint would do it:

```
POST /api/admin/uploads        (ADMIN, multipart "file")
  -> 201 { "url": "https://res.cloudinary.com/..." }
```

It can reuse `FileServiceImpl` and the existing Cloudinary config unchanged. Once it
exists, swapping the two URL fields for a file picker is a small, contained frontend
change — the preview and validation are already there.

---

## 5. What happens until all this exists

The frontend was built to survive the absence of every endpoint above, and this is
covered by the e2e suite:

- **Storefront** — categories fall back to the current static collections. Navigation,
  homepage cards and every collection page look and behave exactly as they do today.
- **Admin product form** — falls back to the old hardcoded Perfume / Attar / Handicraft
  dropdown. Without this, an empty dropdown would have blocked saving *any* product.
- **Admin product list** — the category filter falls back to the same three chips.
- **Homepage** — no banners, or no banner endpoint, means the existing hero stays.
- **Category and Banner admin pages** — these are the only two screens that genuinely
  need the API. They show the normal error panel with a retry.

The first failing call is remembered in `localStorage` for 10 minutes, so a missing
endpoint is probed roughly once per browser rather than on every page load. That keeps
the console clean and costs nothing once the endpoints are live.

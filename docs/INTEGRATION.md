# Backend integration notes — CosmicPerfumes_Backend

How the Cosmic Life storefront and admin panel use the Spring Boot API in
[cosmicperfume33/CosmicPerfumes_Backend](https://github.com/cosmicperfume33/CosmicPerfumes_Backend) (`Forgex/`, commit
`58e86ac` "Add multiple image of Product feature"), which of that backend's behaviours the UI is written around, and what
was tested. Money is in **paise** on the wire and converted only for display.

## 1. Endpoints used

All calls go through `src/lib/api/client.ts` to the site's own `/api/...` (forwarded to the backend) with
`Authorization: Bearer <jwt>` when signed in, and **no cookies** (`credentials: "omit"`, see §3). Ids are validated before
a URL is built (`src/lib/ids.ts`).

| Area | Method & path | Auth | Used by |
| --- | --- | --- | --- |
| Auth | `POST /api/auth/signin`, `POST /api/auth/signup`, `GET /api/auth/user`, `POST /api/auth/signout` | – / token | account page, session check, admin role re-check |
| | `POST /api/auth/forgot/password?email=`, `POST /api/auth/verify-otp?email=&otp=`, `POST /api/auth/reset-password?email=` `{password, confirmPassword}` | – | password reset (three steps) |
| Products | `GET /api/public/products?pageNumber&pageSize=100&sortBy=productId&sortOrder=asc` (every page) | – | whole storefront, admin lists |
| Cart | `GET /api/carts/users/cart` | user | bag drawer, navbar count, checkout |
| | `POST /api/carts/products/{id}/quantity/{n}`, `PUT /api/cart/products/{id}/quantity/{add\|delete}`, `DELETE /api/carts/{cartId}/product/{id}` | user | Add to cart / Buy now, + and −, Remove |
| Addresses | `GET /api/users/addresses`, `POST /api/addresses`, `GET /api/addresses/{id}`, **`PUT /api/addresses/{id}`**, `DELETE /api/addresses/{id}` | user | checkout, account, order pages, admin order detail |
| Checkout | `GET /api/checkout/preview?coupon=` | user | server price + coupon check |
| | `POST /api/checkout` `{addressId, paymentMethod: RAZORPAY\|COD, couponCode?}` | user | creates the order, reserves stock |
| | `POST /api/payments/verify` `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` | user | server-side signature check → `PAID` |
| Orders | `GET /api/orders`, `GET /api/orders/{id}`, `GET /api/orders/{id}/invoice` (PDF) | user | account, order page |
| Admin products | `POST /api/admin/products`, `PUT /api/admin/products/{id}`, `DELETE /api/admin/products/{id}` | admin | product editor, inline stock, live/hidden, delete |
| Admin gallery | `PUT /api/admin/products/{id}/image` (multipart `image`, repeated), `DELETE /api/admin/products/{id}/images/{imageId}`, `PUT /api/admin/products/{id}/images/{imageId}/primary` | admin | Images panel (up to 8) |
| Admin orders | `GET /api/admin/orders`, `PATCH /api/admin/orders/{id}/status?status=`, `GET /api/admin/orders/{id}/invoice` | admin | orders, dashboard, customers |
| Admin coupons | `GET/POST /api/admin/coupons`, `PUT/DELETE /api/admin/coupons/{id}` | admin | coupons |
| Admin users | `GET /api/admin/users`, `GET /api/admin/users/{username}`, `GET /api/admin/users/userId/{id}` | admin | Users |
| All carts | **`GET /api/carts`** | signed in | dashboard "In shoppers' bags" |

**Not used, on purpose:** the keyword/category/gender product endpoints (they answer HTTP 302 with a body, which browsers
treat as a failed request; filtering and search run on the full, cached list instead), `GET /api/addresses` (every
customer's addresses), `GET /api/auth/username`, and `/health` (outside `/api`, so the rewrites don't forward it).

## 2. What changed in the frontend for this backend

| Change | Why |
| --- | --- |
| **Removed Build Your Own Box**: builder, homepage teaser, `/build-your-box` page (now a redirect to `/collections/all`), box cart lines, box contents on orders, admin Boxes page, `lib/api/bundles.ts`, the unused `lib/serverCart.ts`. | The backend has no bundle entity or endpoints, so a box can't be priced or validated by the server. `types.ts` had already been stripped of the bundle types, which left the project failing to compile (50 TypeScript errors). |
| Product delete calls `DELETE /api/admin/products/{id}`. | It called `/api/public/products/{id}`, which this backend doesn't have. |
| **Address editing** on the account page and at checkout (`PUT /api/addresses/{id}`). State and mobile number are shown but locked, with a note. | The endpoint exists; `AddressServiceImpl.UpdateAddresses` saves building, street, city, PIN and country only, so editing the other two would silently do nothing. The form also notes that orders placed to that address show the change (orders point at the address row). |
| Lowering a quantity above the stock left (bag "−", "Use available quantities") removes the line and adds back what can be ordered. Stepping down is used whenever each step is within stock. | `CartServiceImpl.updateProductQuantityInCart` runs the stock check on decreases too: from 4 with 2 left, "4 → 3" is refused. |
| The client sends the Bearer header and **no cookies**; the sign-in cookie is never stored. | `AuthTokenFilter.parseJwt` reads the `springBootEcom` cookie *before* the header, so a leftover cookie (another account, or the empty one sign-out leaves) would override the session in use. |
| 401 handling: a signed-in 401 checks the session first; if it's still valid the request is reported as a failure (or as "not allowed" on an admin path for a non-admin); on public paths the 401 boilerplate is reported as a server error. | `/error` isn't a permitted path, so every unhandled error — a wrong role (403), unknown path (404), bad path value, database constraint, entity validation failure, multipart limit, mail failure — reaches the browser as `401 Full authentication is required`. |
| The admin users API strips `password` from every `UserDTO` on arrival; the Roles column only appears if the API ever sends roles. | `UserDTO` includes the bcrypt hash and no roles. |
| Dashboard panel **"In shoppers' bags"** from `GET /api/carts`: bags, units and value, top products, flagged when bags hold more than the stock left. Dashboard notes updated (Users page exists; Build Your Own Box unsupported). | The endpoint exists; bags don't reserve stock, so this is useful demand information. |
| Users page mobile layout fixed (the table forced the page 140 px wider than a phone). | Found by the phone-layout test. |
| Tablets (768–1023 px) use the phone header (menu button); the full menu starts at 1024 px. | Six menu items beside the wordmark pushed the page sideways on tablets (it already overflowed at 768 px with five). |
| Copy and comments: "the server empties the cart" (not "removes the ordered lines"), checkout reuse note, reset-flow docs. | This backend clears the whole cart on COD placement and on payment, and creates a new order on every checkout call. |
| **Handicraft Collection**, a third collection of hand-worked metal pieces: `World`/`ProductType` "handicraft" with a `Material` of brass / copper / others; top-menu item with Brass, Copper and Others links; [ Attar \| Perfume \| Handicraft ] switcher; a third panel in "Choose your world"; homepage section after it (`components/collections/HandicraftCollection.tsx`); Handicrafts category card; `/collections/handicraft` with a Material filter (`?material=`); handicraft product pages ("Handicraft · Brass", per-material care notes, handicraft suggestions); admin Type "Handicraft" with a Material field, and a Handicraft filter on the product list. Handicrafts are kept out of every fragrance collection and section. | Uses the backend's `Category.HANDICRAFT` and the `Material` enum (`COPPER`, `BRASS`, `OTHERS`) on `Product`. `productWorld` in `lib/catalog.ts` maps the category to the world and `productMaterial` reads the material; a product saved with no category and no fragrance family (how handicrafts were stored before these enums) still lands in the collection, under Others. `/collections/brass` redirects to `/collections/handicraft`. |

Theme, typography, colours and animations are unchanged.

## 3. Backend behaviours the UI follows

- **Cart**: at most 10 per product, never above stock, inactive products can't be added (400 with the reason). Any
  operation other than `delete` adds one. `DELETE` answers with text ("Royal Oud removed from cart"), so the bag is
  fetched again. A product switched off after it was added stays in the cart with `active: false`; the bag and checkout
  say so and checkout is blocked until it's removed.
- **Checkout**: every `POST /api/checkout` creates a new order and reserves stock. The storefront keeps the unpaid online
  order in `sessionStorage` for 15 minutes and resumes it (same cart, address and coupon) instead of creating another.
  Unpaid orders are cancelled and their stock released after 15 minutes (checked every 5). COD → `CONFIRMED` /
  `PENDING_COD` and the cart is emptied; online → `PENDING_PAYMENT` until verify (HMAC) or the `payment.captured`
  webhook, then `PAID` and the **whole** cart is emptied (including anything added after checkout started). A payment
  arriving after the order expired is refunded (`REFUNDED`).
- **Order numbers** (`FGX-2026XXXXXXXX`) are shown everywhere an order is listed or opened.
- **Invoices** exist for every order that isn't awaiting payment or cancelled.
- **Password reset**: `forgot/password` (404 for an unknown email, `"invalid email"` text if sending failed) →
  `verify-otp` (the code is used up on success) → `reset-password?email=`. Mismatched passwords come back as 200 with a
  message, so the form checks them first.
- **Addresses** are validated on the entity when saved (a failure is a 401, see §2), so the form enforces the same
  rules first: building and street ≥ 5, city ≥ 4, state ≥ 2, country ≥ 2, PIN ≥ 5, phone 10–15. An address an order
  uses can't be deleted (foreign key), explained in place.
- **Products**: a product still in an order *or a shopper's cart* can't be deleted (foreign key); the editor says so
  and suggests hiding it. Duplicate slugs are a database error; the editor checks slugs against the list first.
- **Uploads**: no multipart settings in `application.properties`, so Spring's defaults apply (1 MB per file, 10 MB per
  request). Photos are resized in the browser below 1 MB; 8 × that fits in one request.
- **Admin status moves**: Paid → Confirmed/Cancelled, Confirmed → Shipped/Cancelled, Shipped → Delivered. Cancelling
  neither refunds nor restocks; the panel warns.

## 4. Verification

**Ran in this workspace:**

| Check | Result |
| --- | --- |
| `npm run typecheck` (tsc) | pass, 0 errors (was 50 errors in the uploaded zip) |
| `npm run lint` (ESLint) | pass, 0 problems |
| `npm test` (Vitest: API client error handling, ids, cart mapping and problems, server-cart store, handicraft classification and materials) | 69 tests pass |
| `npm run build` | pass |
| `tests/e2e/routes.e2e.mjs` — 44 routes × desktop + phone | pass |
| `tests/e2e/api.e2e.mjs` — the backend contracts above | 42 checks pass |
| `tests/e2e/collections.e2e.mjs` — the Handicraft Collection (brass, copper and others), desktop + phone | 61 checks pass |
| `tests/e2e/checkout.e2e.mjs` | 40 checks pass |
| `tests/e2e/admin.e2e.mjs` | 55 checks pass |
| `tests/e2e/account.e2e.mjs` | 10 checks pass |
| All six suites against the dev server **and** the production build (`vite preview`) | pass |

The browser tests run against `tests/e2e/forgex-double.mjs`, a stand-in for the API rewritten from this backend's source
(security rules, cookie-first JWT, the 401-for-everything error path, cart rules, checkout, gallery, users, coupons,
addresses), with a fake Razorpay window that signs like Razorpay.

**Not run here:** the Spring Boot build itself — Maven Central is blocked from this workspace, so the backend couldn't be
compiled or started; real Razorpay Checkout and Cloudinary (they need your keys).

**Checking against the real backend** (Razorpay **test** keys): sign up, make the account an admin (README), add a
product with three photos and set the second as main; add a handicraft piece (Type "Handicraft", Material "Copper") and
check it shows under Handicraft → Copper and nowhere among the fragrances; as a customer, add it twice, edit your address,
pay online and check the order shows `PAID` with its order number and the bag is empty; place a COD order; as admin, try
to delete the ordered product (refused) and look at "In shoppers' bags".

## 5. Backend issues to fix (not changeable from the frontend)

1. **Password reset needs only an email.** `ForgotServiceImpl.resetPassword` doesn't check that a code was verified, so
   anyone who knows an address can set that account's password with `POST /api/auth/reset-password?email=…`. Keep the
   verified state per email (with expiry) and require it — the storefront already sends the code as `otp`.
2. **`GET /api/admin/users` returns password hashes** (`UserDTO.password`). Remove the field.
3. **No ownership checks on addresses by id.** Any signed-in user can read, edit or delete any address
   (`GET/PUT/DELETE /api/addresses/{id}`), and `GET /api/addresses` lists every customer's addresses.
4. **`GET /api/carts` is open to every signed-in user** (it lists every cart). Restrict it to `ROLE_ADMIN`.
5. **`/error` isn't permitted**, so every unhandled error is a 401 and a wrong role is a 401 instead of 403. Add
   `.requestMatchers("/error").permitAll()` and handlers for `DataIntegrityViolationException` (409) and
   `MaxUploadSizeExceededException` (413).
6. **The JWT secret and the database password are committed** (`application.properties`, `.vscode/settings.json`).
   Rotate both and read the secret from the environment.
7. `AddressServiceImpl.UpdateAddresses` doesn't copy `state` or `phoneNumber`.
8. `CartServiceImpl.updateProductQuantityInCart` checks stock when a quantity goes down, which stops shoppers stepping
   down from an over-stock line.
9. Each checkout call creates a new order and reserves stock again; an abandoned order holds its stock for up to
   20 minutes.
10. The reset email's subject says "AgriPro".
11. **Invoices print one HSN code for every line** (`shop.invoice.hsn=3303`, perfumes). Brass and copper items fall under a
    different HSN (chapter 74). If invoices must show it, the backend needs an HSN per product or per category. Check
    with your accountant.

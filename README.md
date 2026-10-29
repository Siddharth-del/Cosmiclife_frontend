# Cosmic Life — Parfums & Attars (React + Vite)

The Cosmic Life storefront and the ForgeX admin panel, built on **React 19 + Vite 7 + React Router 7 + TypeScript +
Tailwind CSS 3 + Framer Motion + Zustand**. Everything runs against the Spring Boot API in
**[CosmicPerfumes_Backend](https://github.com/cosmicperfume33/CosmicPerfumes_Backend)** (`Forgex/`): products with image
galleries, accounts, addresses, the server cart, checkout, Razorpay and cash-on-delivery payments, orders, invoices, and
the admin tools for products, orders, coupons, users and customers.

| | URL |
| --- | --- |
| Storefront, local | **http://localhost:5173** |
| Admin panel, local | **http://localhost:5173/admin** (sign in with an account that has `ROLE_ADMIN`) |
| Backend API, local | **http://localhost:8080** |
| Storefront, deployed | Render (`render.yaml`) or Vercel (`vercel.json`) |
| Backend API, deployed | `https://forgex-website.onrender.com` (set in `render.yaml`, `vercel.json` and `.env.production`) |

**How the storefront talks to the API:** the browser only ever calls the storefront's own `/api/...` address, and the
server in front of it forwards those calls to the backend (Vite's dev/preview server locally, a rewrite rule on
Render/Vercel). The browser never makes a cross-site request, so CORS isn't involved in normal use.

Requires **Node 20.19+ or 22.12+**. Full endpoint map, the backend behaviours the UI follows, and test results:
**[docs/INTEGRATION.md](docs/INTEGRATION.md)**.

## Run it locally

1. Start the backend on port 8080 (from the backend repo's `Forgex` folder). It reads `DATABASE_URL`, `DB_USERNAME`,
   `DB_PASSWORD` (PostgreSQL), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (use **test** keys),
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `MAIL_USERNAME` and `MAIL_PASSWORD`:

   ```bash
   ./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
   ```

2. Start the storefront:

   ```bash
   npm install
   npm run dev                   # http://localhost:5173
   ```

3. Create an account at http://localhost:5173/account (**Create account**). The backend creates the `ROLE_USER` and
   `ROLE_ADMIN` roles on start-up but no accounts. To make an account an admin, run once in PostgreSQL:

   ```sql
   INSERT INTO user_role (user_id, role_id)
   SELECT u.user_id, r.role_id FROM users u, roles r
   WHERE u.email = 'you@example.com' AND r.role_name = 'ROLE_ADMIN';
   ```

   Sign out and in again: **Admin** appears in the navbar.

### Configuration (public values only)

| Variable | Used by | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_PROXY_TARGET` | `npm run dev`, `npm run preview` | `http://localhost:8080` (`.env.development`) | Where `/api` is forwarded |
| `VITE_API_BASE_URL` | the browser | empty | Empty = call this site's own `/api` (recommended). To call the backend directly, set its URL here and add this site's origin to the backend's `corsConfigurationSource` (WebSecurityConfig.java) |
| `VITE_NEWSLETTER_URL` | the browser | empty | Optional public form endpoint of your email provider for the newsletter |

`.env.example` lists them. **Never put secrets in `VITE_` variables**: they end up in the browser. The Razorpay key id
the checkout uses arrives from the backend with each order; the Razorpay secret, Cloudinary keys, JWT secret and
database credentials stay on the backend. Use `.env.local` (git-ignored) for machine-only overrides.

## Deploy

### The storefront (this folder)
- **Render:** `render.yaml` is a static-site Blueprint. It builds with `npm ci && npm run build`, publishes `dist/`,
  forwards `/api/*` to the backend, and serves `index.html` for every page so deep links (including `/admin/...`) work.
  Without a Blueprint: **New → Static Site**, build `npm ci && npm run build`, publish `dist`, and add the rewrites
  `/api/*` → `https://<your-backend>/api/*`, then `/*` → `/index.html`, in that order.
- **Vercel:** `vercel.json` has the same two rewrites.

If the `/api` rule is missing, pages say *"The store isn't connected to its server"*. Render's free tier sleeps after
~15 minutes idle; the first request can take up to a minute and forms say they're waking the server.

### The backend
- Browsers send an `Origin` header on POST/PUT/DELETE even to their own site, and the rewrite passes it on. The backend
  accepts `http://localhost:5173`, `https://cosmiclife.in`, `https://www.cosmiclife.in` and `https://*.vercel.app`
  (hard-coded in `WebSecurityConfig.corsConfigurationSource`) and answers **403 "Invalid CORS request"** to any other
  origin, so **add your storefront's domain there** if it isn't one of those (for example a `*.onrender.com` address).
- In the Razorpay Dashboard, point a webhook at `https://<your-backend>/api/public/webhooks/razorpay` for
  `payment.captured` and `payment.failed` (it marks orders paid even if the customer closes the tab right after paying).

## What's connected

| Area | Where | Backend |
| --- | --- | --- |
| Products, collections, search, filters, product gallery | `src/lib/catalog.ts` | `GET /api/public/products` (all pages; only active products are shown) |
| Sign in, sign up, password reset, session | `src/components/layout/AccountView.tsx`, `src/store/auth.ts` | `/api/auth/*` |
| Bag (the account's server cart) | `src/store/cart.ts`, `src/lib/cart.ts`, `src/lib/api/cart.ts`, `src/components/cart/CartDrawer.tsx` | `/api/carts/...`, `/api/cart/...` |
| Addresses: add, **edit**, remove | `src/components/account/Addresses.tsx`, checkout | `/api/addresses`, `/api/addresses/{id}`, `/api/users/addresses` |
| Checkout, coupons, Razorpay, COD | `src/components/cart/CheckoutView.tsx`, `src/lib/payOrder.ts` | `/api/checkout/preview`, `/api/checkout`, `/api/payments/verify` |
| Orders, invoices | `src/components/orders/*`, `/account`, `/account/orders/:id` | `/api/orders`, `/api/orders/{id}/invoice` |
| Admin panel | `src/layouts/AdminLayout.tsx`, `src/pages/admin/*` | `/api/admin/*`, `/api/carts` |

**The bag is the account's server cart.** Shoppers sign in to add to it; "Add to cart" while signed out goes to sign-in
and back. Every change (add, +/−, remove) is a request, and the bag, navbar count and checkout show the cart the server
sends back, so they always match what an order will contain. The backend re-checks stock on every change, lowering
included, so "−" on a line that has more than the stock left goes straight to what can be ordered.

**Payments are confirmed by the server only.** The Razorpay window's success callback is sent to
`POST /api/payments/verify`, where the backend checks the signature with its secret; the shopper sees "Payment received"
only when the backend says the order is `PAID`. Closing the window keeps the order reserved (15 minutes on the backend)
and the checkout resumes that same order instead of creating another (the backend itself would create a new one).

All requests go through one client, `src/lib/api/client.ts`: base URL, the **Bearer token only** (cookies are never
sent, because this backend reads its JWT cookie before the header), timeouts, and readable errors. This backend answers
**401 for every error it doesn't handle itself** (a wrong role, a database constraint, an unknown path), so the client
checks the session before signing anyone out and reports those as what they are. Ids are checked before a URL is built
(`src/lib/ids.ts`).

**Build Your Own Box isn't available:** this backend has no bundle endpoints, so there is no way to price a box on the
server. The builder, box cart lines and the admin Boxes page have been removed; old `/build-your-box` links go to the
full collection.

**The Handicraft Collection** is the house's third collection, next to Perfume and Attar: hand-worked metal pieces
such as stands, glasses and vessels, not fragrances. Each piece carries a **material**: **Brass**, **Copper** or
**Others**. Shoppers reach the collection from the **Handicraft** item in the top menu (All Handicrafts, Brass, Copper,
Others), the third tab of the [ Attar | Perfume | Handicraft ] switcher on collection pages and in the phone menu, a
third panel in the homepage's "Choose your world", the Handicraft homepage section right after it, a "Handicrafts" card
under Shop by category, and the footer. Its page is `/collections/handicraft`, with a **Material** filter;
`?material=brass`, `?material=copper` or `?material=others` opens it filtered. Handicraft product pages read
"Handicraft · Brass" instead of perfume/attar and for him/her, show **Caring for brass** (or copper) instead of "How to
wear", and suggest other handicraft pieces. Handicrafts never appear in the fragrance sections (All Fragrances, For
Him / Her, The Oud Edit, New Arrivals, bestsellers, gifting, the fragrance finder). The old `/collections/brass` link
redirects here.

**This needs the two backend enums.** `Category` must include `HANDICRAFT`, and `Product` needs a `material` field
backed by a `Material` enum of `COPPER`, `BRASS`, `OTHERS`:

```java
public enum Category { ATTAR, PERFUME, HANDICRAFT }
public enum Material { COPPER, BRASS, OTHERS }
```

In the admin, add a piece with **Type → "Handicraft"**: the For and Fragrance family fields are replaced by
**Material**, and the product is saved with `category: "HANDICRAFT"`, the chosen material, and no gender or fragrance
family. A piece saved before these enums existed (no category, no fragrance family) still shows in the collection, under
Others. Everything else (price, stock, gallery, cart, checkout, orders, invoices) works as for any product.

One backend detail to check with your accountant: invoices print one HSN code for every line (`shop.invoice.hsn=3303`,
perfumes). Brass and copper articles use a different HSN (chapter 74), and the backend has no per-product HSN.

The section photograph (`public/images/campaign/handicraft.webp`, portrait 4:5), the page banner
(`banner-handicraft.webp`, 2400 × 900) and the category card (`cat-handicraft.webp`, 1500 × 1300) are studio renders
made for this build. Replace them with your own photography under the same names. The copy lives with the collection in
`src/data/collections.ts`.

## Admin panel

`/admin` has its own layout (black and gold), separate from the storefront. Signed-out visitors are sent to sign in;
signed-in customers see an "Admins only" page; the admin role is re-checked with `GET /api/auth/user` instead of trusting
the stored profile. **The real protection is the backend's `ROLE_ADMIN` rule on `/api/admin/**`.**

- **Dashboard**: orders to fulfil, last-30-day sales, online payments captured, COD open/delivered, awaiting payment,
  customers, average order, catalogue health, recent orders, status breakdown, stock to watch, and **what's sitting in
  shoppers' bags** (from `GET /api/carts`, flagged when bags hold more than the stock left).
- **Products**: search and filters, create/edit, inline stock, live/hidden switch, a **gallery of up to 8 photos**
  (upload several, choose the main one, delete one; photos are resized in the browser to fit Spring's 1 MB default),
  delete with a clear message when an order or a bag still holds the product.
- **Orders**: filter, search, detail with address and items, only the status moves the backend allows (Paid →
  Confirmed/Cancelled, Confirmed → Shipped/Cancelled, Shipped → Delivered), invoice PDF.
- **Coupons**: create, edit, switch on/off; percent (1–90, optional cap) or fixed amount, minimum order, usage limit, dates.
- **Users**: every account, paged and searchable by username (read-only; the API sends no roles).
- **Customers**: everyone who has ordered, from order history.

Not available because the API doesn't support it: refunds (use the Razorpay Dashboard), editing or disabling accounts,
shipment tracking numbers, reviews, fragrance notes, gift sets and Build Your Own Box.

## Scripts

```bash
npm run dev          # dev server, http://localhost:5173
npm run build        # type-check, then production build into dist/
npm run preview      # serve dist/ at http://localhost:4173
npm run typecheck
npm run lint
npm test             # unit tests (Vitest)
npm run test:double  # backend test double on :8080 (for the browser tests)
npm run test:e2e     # browser tests, see tests/e2e/README.md
```

## Project structure

```
index.html              page shell (title, meta, favicon)
vite.config.ts          React plugin, @/ alias, /api proxy, dev server on localhost:5173
render.yaml, vercel.json  static hosting (/api rewrite + SPA fallback)
docs/INTEGRATION.md     endpoints, backend behaviours, test results, backend to-dos
vitest.config.ts        unit tests (src/**/*.test.ts)
tests/e2e/              Playwright suites + a test double of CosmicPerfumes_Backend
src/
  router.tsx            all routes; storefront under RootLayout, admin under AdminLayout
  layouts/              RootLayout (storefront shell), AdminLayout (admin shell + access check)
  pages/                one file per route; pages/admin/ for the admin panel
  components/           storefront sections; account/ (addresses), orders/, admin/ (admin UI kit)
  lib/                  api/ (one module per backend area), ids.ts, catalog.ts, payOrder.ts, razorpay.ts,
                        cart.ts, pendingPayment.ts, orders.ts, admin.ts, image.ts, site.ts
  store/                cart (server cart), wishlist, ui, toast, auth (Zustand; wishlist and auth persisted)
  hooks/  data/  types/
public/images/campaign/ brand campaign renders (bottles carry only the brand name)
```

| Route | Page |
| --- | --- |
| `/` | Home |
| `/collections/:slug` | `perfumes`, `attars`, `handicraft` (`?material=brass` / `copper` / `others`), `oud`, `new-arrivals`, `him`, `her`, `all` (`bestsellers` and `gift-sets` redirect to `all`; `brass` redirects to `handicraft`) |
| `/products/:slug` | Product page |
| `/checkout` | Checkout (sign-in required) |
| `/account`, `/account/orders/:id` | Profile, orders, addresses; order detail, payment resume, invoice |
| `/admin`, `/admin/orders[/:id]`, `/admin/products[/new\|/:id]`, `/admin/coupons`, `/admin/customers`, `/admin/users` | Admin panel |
| `/journal`, `/journal/:slug`, `/about`, `/wishlist`, `/help/:slug` | Editorial, story, saved items, customer care |
| `/build-your-box` | Redirects to `/collections/all` |

## Before launch

- Replace the placeholder contact details in `src/lib/site.ts` (`care@cosmiclife.in`, `+91 00000 00000`).
- Shipping, returns, refund, privacy and terms pages are marked as templates: confirm delivery times and return windows,
  and have them reviewed.
- Fix the backend security gaps listed in `docs/INTEGRATION.md` §5 — above all, **password reset needs only an email
  address**, and the admin users endpoint returns password hashes.
- The newsletter form has no backend endpoint. Set `VITE_NEWSLETTER_URL` to your email provider's public form endpoint;
  until then it tells visitors sign-ups aren't open yet.

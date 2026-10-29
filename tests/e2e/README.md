# Browser tests (Playwright)

These suites drive the real storefront and admin panel in Chromium. They run against `forgex-double.mjs`, a stand-in
for [CosmicPerfumes_Backend](https://github.com/cosmicperfume33/CosmicPerfumes_Backend) written from its source: same
endpoints, DTO fields and status codes, the security rules (including the JWT cookie being read before the Bearer
header, and every unhandled error coming back as 401 because `/error` isn't permitted), the cart rules (stock checked on
decreases too, text answer on delete), checkout maths and stock reservation, emptying the cart on payment, Razorpay
signature and webhook checks (HMAC-SHA256), order transitions, coupons, address rules (PUT keeps state and phone),
the product gallery, admin users (including the password hash it sends), the password-reset steps and Spring's default
1 MB upload limit. Each request is rolled back if it fails, like a transaction. Razorpay's checkout.js is replaced in the
browser by a small fake that pays, closes, fails, or returns a forged signature on request.

They prove the frontend follows the backend's contracts. They are **not** a substitute for a run against the real
backend with Razorpay test keys (see `docs/INTEGRATION.md`, "Checking against the real backend").

## Run

```bash
npm i --no-save playwright && npx playwright install chromium   # once
npm run test:double        # terminal 1: test double on http://localhost:8080 (seeded data, resets per suite)
npm run dev                # terminal 2: storefront on http://localhost:5173, /api → :8080
npm run test:e2e           # terminal 3: all suites
```

Against a production build: `npm run build`, then `VITE_API_PROXY_TARGET=http://localhost:8080 npm run preview`
and `APP=http://localhost:4173 npm run test:e2e`. Screenshots go to your temp folder (`SHOTS=dir` to change).

The double seeds two accounts for the tests, `user1@example.com` / `password1` and `admin@example.com` / `adminPass`.
The real backend seeds none (see the main README to make an admin).

| Suite | Covers |
| --- | --- |
| `routes.e2e.mjs` | 44 storefront routes × desktop and phone: no console errors, failed requests or sideways scroll; inactive and removed products 404; `/build-your-box` redirects |
| `collections.e2e.mjs` | the Handicraft Collection (category `HANDICRAFT` with a `material` of BRASS, COPPER or OTHERS): a third panel in "Choose your world", the homepage section right after it, newest first, per-material links; no handicraft pieces in bestsellers, gifting, the finder or any fragrance collection; Handicrafts category card; `/collections/handicraft`, the three-way switcher, the Material filter and `?material=` links from the Handicraft menu; the old `/collections/brass` redirect; product page (Handicraft · material label, per-material care notes, handicraft suggestions); Add to cart; phone menu Handicraft tab; admin Type "Handicraft" shows Material, saves the enum pair and reopens with both; section and card hidden when no piece is live; desktop and phone |
| `api.e2e.mjs` | the backend contracts the UI relies on (error statuses, cookie-first JWT, cart rules, address PUT, a new order per checkout, cart emptied on payment, reset steps, gallery, users DTO), plus NOTE lines for the backend's security gaps |
| `checkout.e2e.mjs` | signed-out Add to cart → sign in → back (no cookie stored); bag drawer + / Remove; address validation, save and edit (state/phone locked); server price and coupons; Razorpay closed / failed / retried / paid; forged signature never paid; resume from the order page; triple-click → one order; COD; stock bought by someone else mid-checkout; "−" above the stock left; phone layout |
| `admin.e2e.mjs` | non-admins refused by the API and the UI, tampered local role, expired session, dashboard figures and "In shoppers' bags", product create/validate/upload (7 MB PNG → under 1 MB), gallery main image and delete, inline stock, hide/show, delete refused while an order or bag holds the product, order status flow, paid-order cancel warning, invoices, coupons, users (no hash on the page, search, account panel), phone layouts |
| `account.e2e.mjs` | orders and addresses on the account page, edit an address, address in use can't be removed, another customer's order is not visible, password reset (wrong code, mismatch, success, mail failure) |

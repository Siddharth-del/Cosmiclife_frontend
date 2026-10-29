import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = Number(process.env.PORT || 8080);
const SECRET = "test-jwt-secret";
const EXP_MS = Number(process.env.EXP_MS || 3000000);
export const RZP_KEY_ID = "rzp_test_double";
export const RZP_SECRET = "double_razorpay_secret";
export const RZP_WEBHOOK_SECRET = "double_webhook_secret";
const COOKIE = "springBootEcom";
const FREE_ABOVE = 149900, SHIP = 9900;
const INTL_FREE_ABOVE = 15000, INTL_SHIP = 2500;
const MAX_PER_PRODUCT = 10;
const MAX_IMAGES = 8;
const MAX_FILE = 1024 * 1024, MAX_REQUEST = 10 * 1024 * 1024;
const FIXTURES = path.join(path.dirname(new URL(import.meta.url).pathname), "fixtures");
const UPLOADS = path.join(os.tmpdir(), "forgex-double-uploads");
const ALLOWED_ORIGINS = ["http://localhost:5173", "https://www.cosmiclife.in", "https://cosmiclife.in"];
const ALLOWED_ORIGIN_PATTERNS = [/^https:\/\/[^/]+\.vercel\.app$/];

let state;
function seed() {
  const media = (n) => `http://localhost:${PORT}/media/${n}`;
  state = {
    users: new Map([
      ["user1@example.com", { userId: 1, userName: "user1", email: "user1@example.com", password: "password1", roles: ["ROLE_USER"] }],
      ["admin@example.com", { userId: 2, userName: "admin", email: "admin@example.com", password: "adminPass", roles: ["ROLE_USER", "ROLE_ADMIN"] }],
    ]),
    nextUser: 3,
    products: [
      { productId: 1, name: "Royal Oud", slug: "royal-oud", description: "A deep oud oil with saffron and rose.", category: "ATTAR", gender: "UNISEX", fragranceFamily: "WOODY", mrpUsd: 3200, priceUsd: 2400, mrp: 250000, price: 199900, stock: 12, image: media("p1.jpg"), images: [{ imageId: 1, imageUrl: media("p1.jpg"), sortOrder: 0 }, { imageId: 2, imageUrl: media("p3.jpg"), sortOrder: 1 }], active: true },
      { productId: 2, name: "Rose Attar", slug: "rose-attar", description: "Taif rose, distilled into sandalwood.", category: "ATTAR", gender: "WOMEN", fragranceFamily: "FLORAL", mrpUsd: 2000, priceUsd: 1600, mrp: 150000, price: 129900, stock: 3, image: null, images: [], active: true },
      { productId: 3, name: "Amber Nuit", slug: "amber-nuit", description: "Amber, labdanum and black pepper.", category: "PERFUME", gender: "MEN", fragranceFamily: "AMBER", mrpUsd: 3800, priceUsd: 3000, mrp: 300000, price: 249900, stock: 20, image: media("p3.jpg"), images: [{ imageId: 3, imageUrl: media("p3.jpg"), sortOrder: 0 }], active: true },
      { productId: 4, name: "Sea Linen", slug: "sea-linen", description: "Salt air and white musk.", category: "PERFUME", gender: "WOMEN", fragranceFamily: "AQUATIC", mrpUsd: 2400, priceUsd: 2400, mrp: 179900, price: 179900, stock: 0, image: null, images: [], active: true },
      { productId: 5, name: "Hidden Draft", slug: "hidden-draft", description: "Not for sale yet.", category: "PERFUME", gender: "UNISEX", fragranceFamily: "MIXED", mrpUsd: 1500, priceUsd: 1300, mrp: 100000, price: 90000, stock: 5, image: null, images: [], active: false },
      { productId: 6, name: "Vetiver Rain", slug: "vetiver-rain", description: "Vetiver root and petrichor.", category: "PERFUME", gender: "UNISEX", fragranceFamily: "EARTHY", mrpUsd: 2800, priceUsd: 2000, mrp: 220000, price: 159900, stock: 8, image: null, images: [], active: true },
      { productId: 7, name: "Brass Pedestal Stand", slug: "brass-pedestal-stand", description: "A turned brass stand with a galleried tray, for attars on a dressing table.", category: "HANDICRAFT", material: "BRASS", gender: null, fragranceFamily: null, mrpUsd: 3800, priceUsd: 2900, mrp: 249900, price: 189900, stock: 6, image: media("brass-stand.webp"), images: [{ imageId: 4, imageUrl: media("brass-stand.webp"), sortOrder: 0 }], active: true },
      { productId: 8, name: "Hammered Brass Glass", slug: "hammered-brass-glass", description: "A hand-hammered brass tumbler, 300 ml.", category: "HANDICRAFT", material: "BRASS", gender: null, fragranceFamily: null, mrpUsd: 1600, priceUsd: 1200, mrp: 99900, price: 79900, stock: 15, image: media("brass-glass.webp"), images: [{ imageId: 5, imageUrl: media("brass-glass.webp"), sortOrder: 0 }], active: true },
      { productId: 9, name: "Copper Water Tumbler", slug: "copper-water-tumbler", description: "A hand-finished copper tumbler, 350 ml.", category: "HANDICRAFT", material: "COPPER", gender: null, fragranceFamily: null, mrpUsd: 1900, priceUsd: 1500, mrp: 129900, price: 99900, stock: 10, image: media("brass-glass.webp"), images: [{ imageId: 6, imageUrl: media("brass-glass.webp"), sortOrder: 0 }], active: true },
    ],
    nextProduct: 10,
    nextImage: 7,
    carts: new Map(),
    nextCart: 1,
    nextCartItem: 1,
    addresses: [],
    nextAddress: 1,
    orders: [],
    nextOrder: 1,
    nextOrderItem: 1,
    coupons: [{ couponId: 1, code: "WELCOME10", type: "PERCENT", value: 10, minOrderPaise: 100000, maxDiscountPaise: 50000, usageLimit: null, usedCount: 0, validFrom: null, validTo: null, active: true }],
    nextCoupon: 2,
    otps: new Map(),
    mailDown: false,
    log: [],
  };
}
seed();

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function sign(email) {
  const h = b64({ alg: "HS256" }), p = b64({ sub: email, iat: Math.floor(Date.now() / 1000), exp: Math.floor((Date.now() + EXP_MS) / 1000) });
  return `${h}.${p}.${crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url")}`;
}
function verifyJwt(t) {
  try {
    const [h, p, s] = t.split(".");
    if (crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url") !== s) return null;
    const c = JSON.parse(Buffer.from(p, "base64url"));
    return c.exp * 1000 > Date.now() ? c.sub : null;
  } catch { return null; }
}
const ldt = (ms = Date.now()) => new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 23);
const bcryptish = (pw) => `$2a$10$${crypto.createHash("sha256").update(pw).digest("base64").slice(0, 53)}`;
const discountOf = (p) => (p.mrp == null || p.price == null || p.mrp === 0 ? 0 : Math.trunc(((p.mrp - p.price) * 100) / p.mrp));
const imageDTO = (i) => ({ imageId: i.imageId, imageUrl: i.imageUrl, sortOrder: i.sortOrder });
const productDTO = (p, quantity = null) => ({
  productId: p.productId, name: p.name, slug: p.slug, description: p.description, category: p.category, material: p.material ?? null, gender: p.gender, fragranceFamily: p.fragranceFamily,
  mrpUsd: p.mrpUsd ?? null, priceUsd: p.priceUsd ?? null,
  discountUsd: p.mrpUsd && p.priceUsd && p.mrpUsd > 0 ? Math.floor((p.mrpUsd - p.priceUsd) * 100 / p.mrpUsd) : 0,
  quantity, mrp: p.mrp, price: p.price, discount: discountOf(p), stock: p.stock, image: p.image,
  images: [...p.images].sort((a, b) => a.sortOrder - b.sortOrder || a.imageId - b.imageId).map(imageDTO), active: p.active,
});
const findProduct = (id) => state.products.find((p) => p.productId === id);

class HttpErr extends Error { constructor(status, body) { super("http"); this.status = status; this.body = body; } }
const apiEx = (message) => new HttpErr(400, { message, status: false });
const notFound = (res, field, val) => new HttpErr(404, { message: `${res} not found with ${field}: ${val}`, status: false });
const validation = (fields) => new HttpErr(400, fields);
class Unhandled extends Error { constructor(why) { super(why); } }
const unhandled = (why) => new Unhandled(why);
function longVar(raw) {
  if (!/^-?\d{1,18}$/.test(raw)) throw unhandled(`type mismatch '${raw}'`);
  return Number(raw);
}

function cartFor(email) {
  let c = state.carts.get(email);
  if (!c) { c = { cartId: state.nextCart++, items: [] }; state.carts.set(email, c); }
  return c;
}
function cartDTO(c) {
  const products = c.items.map((i) => productDTO(findProduct(i.productId), i.quantity));
  const totalPrice = c.items.reduce((s, i) => s + (findProduct(i.productId).price ?? 0) * i.quantity, 0);
  return { cartId: c.cartId, totalPrice, products };
}
const findItem = (c, id) => c.items.find((i) => i.productId === id);
function sellable(id) {
  const p = findProduct(id);
  if (!p) throw notFound("Product", "productId", id);
  if (p.active !== true) throw apiEx(`${p.name} is not available`);
  return p;
}
function checkQuantity(p, q) {
  if (q > MAX_PER_PRODUCT) throw apiEx(`You can add at most ${MAX_PER_PRODUCT} of ${p.name}`);
  const stock = p.stock ?? 0;
  if (q > stock) throw apiEx(stock === 0 ? `${p.name} is out of stock` : `Only ${stock} left of ${p.name}`);
}

function evaluateCoupon(raw, subtotal) {
  if (!raw || !raw.trim()) return { discount: 0, code: null, message: null };
  const code = raw.trim().toUpperCase();
  const c = state.coupons.find((x) => x.code.toUpperCase() === code);
  const now = ldt();
  if (!c || c.active !== true) return { discount: 0, code: null, message: "Invalid coupon code" };
  if (c.validFrom && now < c.validFrom) return { discount: 0, code: null, message: "This coupon is not active yet" };
  if (c.validTo && now > c.validTo) return { discount: 0, code: null, message: "This coupon has expired" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { discount: 0, code: null, message: "This coupon has reached its usage limit" };
  if (c.minOrderPaise != null && subtotal < c.minOrderPaise) return { discount: 0, code: null, message: `Add ₹${Math.trunc((c.minOrderPaise - subtotal) / 100)} more to use this coupon` };
  let d = c.type === "PERCENT" ? Math.trunc((subtotal * c.value) / 100) : c.value;
  if (c.type === "PERCENT" && c.maxDiscountPaise != null) d = Math.min(d, c.maxDiscountPaise);
  return { discount: Math.min(d, subtotal), code: c.code, message: "Applied" };
}
function calculate(items, coupon, market = "IN") {
  const intl = market === "INTL";
  let subtotal = 0, mrpTotal = 0;
  for (const i of items) {
    const p = findProduct(i.productId);
    const unit = intl ? p.priceUsd : p.price;
    const unitMrp = intl ? p.mrpUsd : p.mrp;
    if (intl && !unit) throw apiEx(`${p.name} is not available for international orders yet`);
    subtotal += unit * i.quantity;
    mrpTotal += (unitMrp ?? unit) * i.quantity;
  }
  const c = intl
    ? { discount: 0, code: null, message: coupon ? "Coupons are not available on international orders yet" : null }
    : evaluateCoupon(coupon, subtotal);
  const after = subtotal - c.discount;
  const freeAbove = intl ? INTL_FREE_ABOVE : FREE_ABOVE;
  const ship = intl ? INTL_SHIP : SHIP;
  const shipping = after >= freeAbove || !items.length ? 0 : ship;
  return { subtotal, mrpTotal, productSavings: mrpTotal - subtotal, couponDiscount: c.discount, couponCode: c.code, couponMessage: c.message, shipping, total: after + shipping };
}

const orderDTO = (o) => ({ orderId: o.orderId, email: o.email, orderNumber: o.orderNumber, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.payment.status, subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total, couponCode: o.couponCode, market: o.market ?? "IN", currency: o.currency ?? "INR", addressId: o.addressId, createdAt: o.createdAt, paidAt: o.paidAt, orderItems: o.items });
function releaseStock(o) { for (const i of o.items) { const p = findProduct(i.productId); if (p) p.stock += i.quantity; } }
function redeemCouponAndClearCart(o) {
  if (o.couponCode) { const c = state.coupons.find((x) => x.code.toUpperCase() === o.couponCode.toUpperCase()); if (c) c.usedCount++; }
  const cart = state.carts.get(o.email);
  if (cart) cart.items = [];
}
function markPaid(o, payId, sig) {
  if (o.status === "PAID") return;
  if (o.status === "CANCELLED") { o.payment.razorpayPaymentId = payId; o.payment.razorpayRefundId = `rfnd_${crypto.randomBytes(6).toString("hex")}`; o.payment.status = "REFUNDED"; o.status = "REFUNDED"; return; }
  if (o.status !== "PENDING_PAYMENT") return;
  o.status = "PAID"; o.paidAt = ldt(); o.payment.status = "CAPTURED"; o.payment.razorpayPaymentId = payId; if (sig) o.payment.razorpaySignature = sig;
  redeemCouponAndClearCart(o);
}
const ALLOWED = { PAID: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["SHIPPED", "CANCELLED"], SHIPPED: ["DELIVERED"] };
const ORDER_STATUSES = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const minimalPdf = (title) => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\n% ${title}\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
const orderNumber = () => `FGX-${new Date().getFullYear()}${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const aDTO = (a) => ({ addressId: a.addressId, street: a.street, buildingName: a.buildingName, city: a.city, state: a.state, country: a.country, pincode: a.pincode, phoneNumber: a.phoneNumber });
function entityValid(a) {
  const min = { street: 5, buildingName: 5, city: 4, state: 2, country: 2, pincode: 5 };
  for (const [k, n] of Object.entries(min)) if (typeof a[k] !== "string" || !a[k].trim() || a[k].length < n) return false;
  return typeof a.phoneNumber === "string" && !!a.phoneNumber.trim() && a.phoneNumber.length >= 10 && a.phoneNumber.length <= 15;
}

function parseImages(raw, contentType) {
  const boundary = contentType.split("boundary=")[1]?.replace(/^"|"$/g, "");
  if (!contentType.startsWith("multipart/form-data") || !boundary) throw unhandled("not multipart");
  const parts = raw.toString("latin1").split(`--${boundary}`).filter((x) => x.includes('name="image"'));
  return parts.map((part) => {
    const at = part.indexOf("\r\n\r\n");
    const head = part.slice(0, at);
    const bytes = Buffer.from(part.slice(at + 4).replace(/\r\n$/, ""), "latin1");
    const type = (head.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] ?? "").trim().toLowerCase();
    return { bytes, type };
  });
}
function resequence(p) {
  p.images.sort((a, b) => a.sortOrder - b.sortOrder || a.imageId - b.imageId);
  p.images.forEach((img, i) => (img.sortOrder = i));
}

const snapshot = () => { const { log, ...rest } = state; return structuredClone(rest); };
const restore = (snap) => { const log = state.log; state = { ...snap, log }; };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const origin = req.headers.origin;
  const json = (st, o, headers = {}) => { res.writeHead(st, { "Content-Type": "application/json", ...headers }); res.end(JSON.stringify(o)); };
  const text = (st, s) => { res.writeHead(st, { "Content-Type": "text/plain;charset=UTF-8" }); res.end(s); };
  const unauthorized = (pathShown = p) => json(401, { status: 401, error: "Unauthorized", message: "Full authentication is required to access this resource", path: pathShown });

  if (origin) {
    const o = origin.replace(/\/+$/, "");
    if (!ALLOWED_ORIGINS.includes(o) && !ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(o))) return text(403, "Invalid CORS request");
    res.setHeader("Access-Control-Allow-Origin", o);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
    if (req.method === "OPTIONS" && req.headers["access-control-request-method"]) {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
      res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "*");
      res.setHeader("Access-Control-Max-Age", "3600");
      res.writeHead(200); return res.end();
    }
  }
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }

  const chunks = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  const cookieJwt = (req.headers.cookie || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const auth = req.headers.authorization || "";
  const token = cookieJwt != null ? cookieJwt : auth.startsWith("Bearer") ? auth.slice(7) : null;
  const email = token ? verifyJwt(token) : null;
  const user = email ? state.users.get(email) : null;
  state.log.push(`${req.method} ${p}${url.search} ${user ? user.email : "anon"}${cookieJwt != null ? " (cookie)" : ""}`);
  const body = () => { try { return raw.length ? JSON.parse(raw.toString()) : {}; } catch { throw unhandled("unreadable body"); } };
  const m = (re) => p.match(re);
  const snap = req.method === "GET" ? null : snapshot();
  let mm;

  try {
    if (p === "/__log") return json(200, state.log);
    if (p === "/__reset") { seed(); return json(200, { ok: true }); }
    if (p === "/__state") return json(200, { orders: state.orders, products: state.products, carts: [...state.carts.entries()], coupons: state.coupons, addresses: state.addresses, users: [...state.users.values()].map(({ password, ...u }) => u) });
    if (p === "/__expire") { for (const o of state.orders) if (o.status === "PENDING_PAYMENT") { releaseStock(o); o.status = "CANCELLED"; o.payment.status = "FAILED"; o.payment.failureReason = "Payment window expired"; } return json(200, { ok: true }); }
    if (p === "/__otp") return json(200, { code: state.otps.get(String(url.searchParams.get("email"))) ?? null });
    if (p === "/__mail") { state.mailDown = url.searchParams.get("down") === "1"; return json(200, { mailDown: state.mailDown }); }
    if (p.startsWith("/media/")) {
      const name = path.basename(p);
      const f = path.join(name.startsWith("upload-") ? UPLOADS : FIXTURES, name);
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg" }); return res.end(fs.readFileSync(f));
    }
    if (req.method === "GET" && p === "/health") return json(200, { status: "UP", service: "cosmiclife" });

    const isAdmin = !!user?.roles.includes("ROLE_ADMIN");
    const open = p.startsWith("/api/auth/") || p.startsWith("/api/public/") || p.startsWith("/images/");
    if (!open && !user) return unauthorized();
    if (p.startsWith("/api/admin/") && !isAdmin) return unauthorized("/error");

    if (req.method === "POST" && p === "/api/auth/signin") {
      const b = body();
      const errs = {};
      if (!b.email || !String(b.email).trim()) errs.email = "must not be blank"; else if (!/^[^\s@]+@[^\s@]+$/.test(b.email)) errs.email = "must be a well-formed email address";
      if (!b.password) errs.password = "must not be blank";
      if (Object.keys(errs).length) throw validation(errs);
      const u = state.users.get(String(b.email).trim().toLowerCase());
      if (!u || u.password !== b.password) return json(401, { message: "Invalid email or password", status: false });
      const jwt = sign(u.email);
      return json(200, { id: u.userId, username: u.userName, email: u.email, roles: u.roles, jwtToken: jwt }, { "Set-Cookie": `${COOKIE}=${jwt}; Path=/api; Max-Age=86400` });
    }
    if (req.method === "POST" && p === "/api/auth/signup") {
      const b = body();
      const errs = {};
      if (!b.username || !String(b.username).trim()) errs.username = "must not be blank"; else if (b.username.length < 3 || b.username.length > 20) errs.username = "size must be between 3 and 20";
      if (!b.email || !String(b.email).trim()) errs.email = "must not be blank"; else if (b.email.length > 50) errs.email = "size must be between 0 and 50"; else if (!/^[^\s@]+@[^\s@]+$/.test(b.email)) errs.email = "must be a well-formed email address";
      if (!b.password || !String(b.password).trim()) errs.password = "must not be blank"; else if (b.password.length < 6 || b.password.length > 40) errs.password = "size must be between 6 and 40";
      if (Object.keys(errs).length) throw validation(errs);
      const e = String(b.email).trim().toLowerCase();
      if (state.users.has(e)) return json(400, { message: "Email is already in use" });
      if ([...state.users.values()].some((u) => u.userName === b.username)) return json(400, { message: "Username is already taken" });
      state.users.set(e, { userId: state.nextUser++, userName: b.username, email: e, password: b.password, roles: ["ROLE_USER"] });
      return json(200, { message: "User registered successfully" });
    }
    if (req.method === "GET" && p === "/api/auth/username") return text(200, user ? user.email : "");
    if (req.method === "GET" && p === "/api/auth/user") {
      if (!user) throw unhandled("anonymous principal can't be cast to UserDetailsImpl");
      return json(200, { id: user.userId, username: user.userName, email: user.email, roles: user.roles, jwtToken: null });
    }
    if (req.method === "POST" && p === "/api/auth/signout") return json(200, { message: "You've been signed out" }, { "Set-Cookie": `${COOKIE}=; Path=/api` });
    if (req.method === "POST" && p === "/api/auth/forgot/password") {
      const e = String(url.searchParams.get("email") ?? "");
      if (!state.users.has(e)) throw notFound("User", "email", e);
      if (state.mailDown) throw unhandled("Failed to send email");
      state.otps.set(e, String(100000 + crypto.randomInt(900000)));
      return text(200, `OTP sent Successfully to email:${e}`);
    }
    if (req.method === "POST" && p === "/api/auth/verify-otp") {
      const e = String(url.searchParams.get("email") ?? ""), otp = url.searchParams.get("otp");
      if (otp != null && state.otps.get(e) === otp) { state.otps.delete(e); return text(200, "OTP Validate"); }
      return text(400, "Invalid OTP");
    }
    if (req.method === "POST" && p === "/api/auth/reset-password") {
      const e = String(url.searchParams.get("email") ?? "");
      const u = state.users.get(e);
      if (!u) throw notFound("User", "email", e);
      const b = body();
      if (b.confirmPassword == null) throw unhandled("NullPointerException");
      if (b.confirmPassword !== b.password) return text(200, "New password and confirm password do not match");
      u.password = b.password;
      return text(200, "Password Changed Successfully!");
    }

    if (req.method === "GET" && p === "/api/public/products") {
      const page = Number(url.searchParams.get("pageNumber") ?? 0), size = Number(url.searchParams.get("pageSize") ?? 50);
      const sortBy = url.searchParams.get("sortBy") ?? "productId", desc = (url.searchParams.get("sortOrder") ?? "asc").toLowerCase() !== "asc";
      if (!(sortBy in state.products[0] || sortBy === "productId")) throw unhandled("PropertyReferenceException");
      const all = [...state.products].sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : a[sortBy] < b[sortBy] ? -1 : 0) * (desc ? -1 : 1));
      const content = all.slice(page * size, page * size + size).map((x) => productDTO(x));
      const totalPages = Math.ceil(all.length / size);
      return json(200, { content, pageNumber: page, pageSize: size, totalElements: all.length, totalPages, lastPage: page >= totalPages - 1 });
    }
    if (req.method === "GET" && m(/^\/api\/public\/products\/(keyword|category|gender)\/[^/]+$/)) return json(302, { content: [] });
    if (req.method === "POST" && p === "/api/public/webhooks/razorpay") {
      const sig = req.headers["x-razorpay-signature"];
      const expected = crypto.createHmac("sha256", RZP_WEBHOOK_SECRET).update(raw).digest("hex");
      if (!sig || sig !== expected) throw apiEx("Invalid webhook signature");
      const event = JSON.parse(raw.toString());
      if (event.event !== "payment.captured" && event.event !== "payment.failed") { res.writeHead(200); return res.end(); }
      const pay = event.payload.payment.entity;
      const o = pay.order_id ? state.orders.find((x) => x.razorpayOrderId === pay.order_id) : null;
      if (o) {
        if (event.event === "payment.captured") markPaid(o, pay.id, null);
        else if (o.status === "PENDING_PAYMENT") o.payment.failureReason = pay.error_description || "Payment failed";
      }
      res.writeHead(200); return res.end();
    }

    if (req.method === "POST" && (mm = m(/^\/api\/carts\/products\/([^/]+)\/quantity\/([^/]+)$/))) {
      const id = longVar(mm[1]), q = longVar(mm[2]);
      if (q < 1) throw apiEx("Quantity must be at least 1");
      const c = cartFor(user.email); const prod = sellable(id);
      let item = findItem(c, id); const nq = (item?.quantity ?? 0) + q;
      checkQuantity(prod, nq);
      if (!item) { item = { cartItemId: state.nextCartItem++, productId: id, quantity: 0 }; c.items.push(item); }
      item.quantity = nq;
      return json(201, cartDTO(c));
    }
    if (req.method === "GET" && p === "/api/carts") return json(200, [...state.carts.values()].map(cartDTO));
    if (req.method === "GET" && p === "/api/carts/users/cart") return json(200, cartDTO(cartFor(user.email)));
    if (req.method === "PUT" && (mm = m(/^\/api\/cart\/products\/([^/]+)\/quantity\/([^/]+)$/))) {
      const id = longVar(mm[1]);
      const delta = decodeURIComponent(mm[2]).toLowerCase() === "delete" ? -1 : 1;
      const c = cartFor(user.email); const item = findItem(c, id);
      if (!item) throw notFound("Product in cart", "productId", id);
      const nq = item.quantity + delta;
      if (nq <= 0) c.items = c.items.filter((i) => i !== item);
      else { checkQuantity(findProduct(id), nq); item.quantity = nq; }
      return json(200, cartDTO(c));
    }
    if (req.method === "DELETE" && (mm = m(/^\/api\/carts\/([^/]+)\/product\/([^/]+)$/))) {
      const cartId = longVar(mm[1]), id = longVar(mm[2]);
      const owned = [...state.carts.entries()].find(([, c]) => c.cartId === cartId);
      if (!owned || owned[0] !== user.email) throw notFound("Cart", "cartId", cartId);
      const c = owned[1]; const item = findItem(c, id);
      if (!item) throw notFound("Product in cart", "productId", id);
      c.items = c.items.filter((i) => i !== item);
      return text(200, `${findProduct(id).name} removed from cart`);
    }

    if (req.method === "POST" && p === "/api/addresses") {
      const b = body();
      const a = { addressId: 0, street: b.street, buildingName: b.buildingName, city: b.city, state: b.state, country: b.country, pincode: b.pincode, phoneNumber: b.phoneNumber, userEmail: user.email };
      if (!entityValid(a)) throw unhandled("ConstraintViolationException on persist");
      a.addressId = state.nextAddress++;
      state.addresses.push(a);
      return json(201, aDTO(a));
    }
    if (req.method === "GET" && p === "/api/addresses") return json(200, state.addresses.map(aDTO));
    if (req.method === "GET" && p === "/api/users/addresses") return json(200, state.addresses.filter((a) => a.userEmail === user.email).map(aDTO));
    if ((mm = m(/^\/api\/addresses\/([^/]+)$/))) {
      const id = longVar(mm[1]);
      const a = state.addresses.find((x) => x.addressId === id);
      if (req.method === "GET") { if (!a) throw notFound("Address", "AddressId", id); return json(200, aDTO(a)); }
      if (req.method === "PUT") {
        if (!a) throw notFound("Address", "AddressId", id);
        const b = body();
        const next = { ...a, buildingName: b.buildingName, city: b.city, country: b.country, pincode: b.pincode, street: b.street };
        if (!entityValid(next)) throw unhandled("ConstraintViolationException on update");
        Object.assign(a, next);
        return json(200, aDTO(a));
      }
      if (req.method === "DELETE") {
        if (!a) throw notFound("Address", "AddressId", id);
        if (state.orders.some((o) => o.addressId === id)) throw unhandled("DataIntegrityViolationException: orders.address_id");
        state.addresses = state.addresses.filter((x) => x !== a);
        return text(200, `Address deleted Successfully with addressId: ${id}`);
      }
    }

    if (req.method === "GET" && p === "/api/checkout/preview") {
      const c = state.carts.get(user.email);
      if (!c) throw notFound("Cart", "email", user.email);
      return json(200, calculate(c.items, url.searchParams.get("coupon"), url.searchParams.get("market") || "IN"));
    }
    if (req.method === "POST" && p === "/api/checkout") {
      const b = body();
      const errs = {};
      if (b.addressId == null) errs.addressId = "must not be null";
      if (b.paymentMethod == null) errs.paymentMethod = "must not be null";
      if (Object.keys(errs).length) throw validation(errs);
      if (!["RAZORPAY", "COD", "UPI"].includes(b.paymentMethod)) throw unhandled("HttpMessageNotReadable: PaymentMethod");
      const c = state.carts.get(user.email);
      if (!c) throw notFound("Cart", "email", user.email);
      if (!c.items.length) throw apiEx("Your cart is empty");
      const addr = state.addresses.find((a) => a.addressId === Number(b.addressId));
      if (!addr) throw notFound("Address", "addressId", b.addressId);
      if (addr.userEmail !== user.email) throw apiEx("Address does not belong to you");
      const market = b.market === "INTL" ? "INTL" : "IN";
      const pr = calculate(c.items, b.couponCode, market);
      if (b.couponCode && b.couponCode.trim() && !pr.couponCode) throw apiEx(pr.couponMessage);
      const items = [];
      for (const ci of c.items) {
        const prod = findProduct(ci.productId);
        if (prod.active !== true) throw apiEx(`${prod.name} is no longer available`);
        if (prod.stock < ci.quantity) throw apiEx(`Only ${prod.stock} left of ${prod.name}`);
        prod.stock -= ci.quantity;
        const unit = market === "INTL" ? prod.priceUsd : prod.price;
        items.push({ orderItemId: state.nextOrderItem++, productId: prod.productId, productName: prod.name, quantity: ci.quantity, unitPrice: unit, mrp: market === "INTL" ? prod.mrpUsd : prod.mrp, lineTotal: unit * ci.quantity });
      }
      const o = { orderId: state.nextOrder++, orderNumber: orderNumber(), email: user.email, items, addressId: addr.addressId, subtotal: pr.subtotal, discount: pr.couponDiscount, shipping: pr.shipping, total: pr.total, couponCode: pr.couponCode, paymentMethod: b.paymentMethod, market, currency: market === "INTL" ? "USD" : "INR", createdAt: ldt(), paidAt: null, payment: { method: b.paymentMethod, amount: pr.total } };
      const resBody = { orderId: o.orderId, status: null, price: pr, razorpayKeyId: null, razorpayOrderId: null, amount: null, currency: null, customerEmail: null };
      if (b.paymentMethod === "COD") {
        o.status = "CONFIRMED"; o.payment.status = "PENDING_COD"; state.orders.push(o);
        redeemCouponAndClearCart(o);
      } else {
        o.status = "PENDING_PAYMENT"; o.payment.status = "CREATED"; state.orders.push(o);
        o.razorpayOrderId = o.payment.razorpayOrderId = `order_${crypto.randomBytes(7).toString("hex")}`;
        Object.assign(resBody, { razorpayKeyId: RZP_KEY_ID, razorpayOrderId: o.razorpayOrderId, amount: o.total, currency: o.currency, customerEmail: user.email });
      }
      resBody.status = o.status;
      return json(201, resBody);
    }
    if (req.method === "POST" && p === "/api/payments/verify") {
      const b = body();
      const errs = {};
      for (const [k, f] of [["razorpay_order_id", "razorpayOrderId"], ["razorpay_payment_id", "razorpayPaymentId"], ["razorpay_signature", "razorpaySignature"]]) if (!b[k] || !String(b[k]).trim()) errs[f] = "must not be blank";
      if (Object.keys(errs).length) throw validation(errs);
      const expected = crypto.createHmac("sha256", RZP_SECRET).update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`).digest("hex");
      if (expected !== b.razorpay_signature) throw apiEx("Payment verification failed");
      const o = state.orders.find((x) => x.razorpayOrderId === b.razorpay_order_id);
      if (!o) throw notFound("Order", "razorpayOrderId", b.razorpay_order_id);
      if (o.email !== user.email) throw apiEx("This order does not belong to you");
      markPaid(o, b.razorpay_payment_id, b.razorpay_signature);
      return json(200, { orderId: o.orderId, status: o.status, price: null, razorpayKeyId: null, razorpayOrderId: null, amount: null, currency: null, customerEmail: null });
    }

    const byCreated = (a, b) => b.createdAt.localeCompare(a.createdAt) || b.orderId - a.orderId;
    const invoice = (o) => {
      if (o.status === "PENDING_PAYMENT" || o.status === "CANCELLED") throw apiEx("An invoice is only available for confirmed orders");
      res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="ForgeX-invoice-${o.orderId}.pdf"` });
      res.end(minimalPdf(`invoice ${o.orderNumber}`));
    };
    if (req.method === "GET" && p === "/api/orders") return json(200, state.orders.filter((o) => o.email === user.email).sort(byCreated).map(orderDTO));
    if (req.method === "GET" && (mm = m(/^\/api\/orders\/([^/]+)$/))) {
      const id = longVar(mm[1]); const o = state.orders.find((x) => x.orderId === id);
      if (!o || o.email !== user.email) throw notFound("Order", "orderId", id);
      return json(200, orderDTO(o));
    }
    if (req.method === "GET" && (mm = m(/^\/api\/orders\/([^/]+)\/invoice$/))) {
      const id = longVar(mm[1]); const o = state.orders.find((x) => x.orderId === id);
      if (!o || o.email !== user.email) throw notFound("Order", "orderId", id);
      return invoice(o);
    }

    if (req.method === "GET" && p === "/api/admin/orders") return json(200, [...state.orders].sort(byCreated).map(orderDTO));
    if (req.method === "PATCH" && (mm = m(/^\/api\/admin\/orders\/([^/]+)\/status$/))) {
      const id = longVar(mm[1]); const o = state.orders.find((x) => x.orderId === id);
      const s = url.searchParams.get("status");
      if (!s || !ORDER_STATUSES.includes(s)) throw unhandled("MethodArgumentTypeMismatch: status");
      if (!o) throw notFound("Order", "orderId", id);
      if (!(ALLOWED[o.status] ?? []).includes(s)) throw apiEx(`Cannot move order from ${o.status} to ${s}`);
      o.status = s;
      return json(200, orderDTO(o));
    }
    if (req.method === "GET" && (mm = m(/^\/api\/admin\/orders\/([^/]+)\/invoice$/))) {
      const id = longVar(mm[1]); const o = state.orders.find((x) => x.orderId === id);
      if (!o) throw notFound("Order", "orderId", id);
      return invoice(o);
    }

    const columnsOk = (pr, id) => !!pr.name && pr.name.length <= 100 && !!pr.slug && pr.slug.length <= 120 && !(pr.description && pr.description.length > 2000) && !state.products.some((x) => x.slug === pr.slug && x.productId !== id);
    if (req.method === "POST" && p === "/api/admin/products") {
      const b = body();
      const pr = { productId: 0, name: b.name, slug: b.slug, description: b.description ?? null, category: b.category ?? null, material: b.material ?? null, mrpUsd: b.mrpUsd ?? null, priceUsd: b.priceUsd ?? null, gender: b.gender ?? null, fragranceFamily: b.fragranceFamily ?? null, mrp: b.mrp ?? null, price: b.price ?? null, stock: b.stock ?? null, image: b.image ?? null, active: b.active ?? true, images: [] };
      if (!columnsOk(pr, -1)) throw unhandled("DataIntegrityViolationException");
      (b.images ?? []).forEach((img, i) => pr.images.push({ imageId: state.nextImage++, imageUrl: img.imageUrl, sortOrder: i }));
      if (!pr.image && pr.images.length) pr.image = pr.images[0].imageUrl;
      pr.productId = state.nextProduct++;
      state.products.push(pr);
      return json(201, productDTO(pr));
    }
    if ((mm = m(/^\/api\/admin\/products\/([^/]+)$/)) && (req.method === "PUT" || req.method === "DELETE")) {
      const id = longVar(mm[1]); const prod = findProduct(id);
      if (!prod) throw notFound("Product", "productId", id);
      if (req.method === "DELETE") {
        const inCart = [...state.carts.values()].some((c) => c.items.some((i) => i.productId === id));
        const inOrder = state.orders.some((o) => o.items.some((i) => i.productId === id));
        if (inCart || inOrder) throw unhandled("DataIntegrityViolationException: cart_item / order_items.product_id");
        state.products = state.products.filter((x) => x !== prod);
        return text(200, "Product deleted successfully");
      }
      const b = body();
      const next = { ...prod, name: b.name, slug: b.slug, description: b.description, category: b.category, material: b.material ?? null, mrpUsd: b.mrpUsd ?? null, priceUsd: b.priceUsd ?? null, gender: b.gender, fragranceFamily: b.fragranceFamily, mrp: b.mrp, price: b.price, stock: b.stock, active: b.active ?? prod.active };
      if (!columnsOk(next, id)) throw unhandled("DataIntegrityViolationException");
      Object.assign(prod, next);
      return json(200, productDTO(prod));
    }
    if (req.method === "PUT" && (mm = m(/^\/api\/admin\/products\/([^/]+)\/image$/))) {
      if (raw.length > MAX_REQUEST) throw unhandled("MaxUploadSizeExceededException (request)");
      const files = parseImages(raw, req.headers["content-type"] || "");
      if (files.some((f) => f.bytes.length > MAX_FILE)) throw unhandled("MaxUploadSizeExceededException (file)");
      if (!files.length) throw unhandled("MissingServletRequestPartException: image");
      const id = longVar(mm[1]); const prod = findProduct(id);
      if (!prod) throw notFound("Product", "productId", id);
      if (prod.images.length + files.length > MAX_IMAGES) throw apiEx(`A product can have at most ${MAX_IMAGES} images; this one already has ${prod.images.length}.`);
      if (files.some((f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type))) throw unhandled("IllegalArgumentException: Images must be JPEG, PNG or WebP");
      let next = prod.images.reduce((n, i) => Math.max(n, i.sortOrder), -1) + 1;
      fs.mkdirSync(UPLOADS, { recursive: true });
      const added = files.map((f, k) => {
        const name = `upload-${prod.productId}-${Date.now()}-${k}.${f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg"}`;
        fs.writeFileSync(path.join(UPLOADS, name), f.bytes);
        const img = { imageId: state.nextImage++, imageUrl: `http://localhost:${PORT}/media/${name}`, sortOrder: next++ };
        prod.images.push(img);
        return img;
      });
      if (!prod.image) prod.image = added[0].imageUrl;
      return json(200, productDTO(prod));
    }
    if ((mm = m(/^\/api\/admin\/products\/([^/]+)\/images\/([^/]+)(\/primary)?$/))) {
      const id = longVar(mm[1]), imageId = longVar(mm[2]);
      const prod = findProduct(id);
      if (!prod) throw notFound("Product", "productId", id);
      const img = prod.images.find((i) => i.imageId === imageId);
      if (req.method === "DELETE" && !mm[3]) {
        if (!img) throw notFound("ProductImage", "imageId", imageId);
        const wasPrimary = img.imageUrl === prod.image;
        prod.images = prod.images.filter((i) => i !== img);
        resequence(prod);
        if (wasPrimary) prod.image = prod.images[0]?.imageUrl ?? null;
        return json(200, productDTO(prod));
      }
      if (req.method === "PUT" && mm[3]) {
        if (!img) throw notFound("ProductImage", "imageId", imageId);
        img.sortOrder = -1;
        resequence(prod);
        prod.image = img.imageUrl;
        return json(200, productDTO(prod));
      }
    }

    const userDTO = (u) => ({ userId: u.userId, userName: u.userName, email: u.email, password: bcryptish(u.password) });
    const userPage = (list) => {
      const page = Number(url.searchParams.get("pageNumber") ?? 0), size = Number(url.searchParams.get("pageSize") ?? 50);
      const sortBy = url.searchParams.get("sortBy") ?? "userId", desc = (url.searchParams.get("sortOrder") ?? "asc").toLowerCase() !== "asc";
      if (!["userId", "userName", "email"].includes(sortBy)) throw unhandled("PropertyReferenceException");
      const all = [...list].sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : a[sortBy] < b[sortBy] ? -1 : 0) * (desc ? -1 : 1));
      const totalPages = Math.ceil(all.length / size);
      return { content: all.slice(page * size, page * size + size).map(userDTO), pageNumber: page, pageSize: size, totalElements: all.length, totalPages, lastPage: page >= totalPages - 1 };
    };
    if (req.method === "GET" && p === "/api/admin/users") return json(200, userPage(state.users.values()));
    if (req.method === "GET" && (mm = m(/^\/api\/admin\/users\/userId\/([^/]+)$/))) {
      const id = longVar(mm[1]); const u = [...state.users.values()].find((x) => x.userId === id);
      if (!u) throw notFound("User", "userId", id);
      return json(200, userDTO(u));
    }
    if (req.method === "GET" && (mm = m(/^\/api\/admin\/users\/([^/]+)$/))) {
      const q = decodeURIComponent(mm[1]).toLowerCase();
      return json(200, userPage([...state.users.values()].filter((u) => u.userName.toLowerCase().includes(q))));
    }

    const couponBinding = (b) => {
      if (b.type != null && !["PERCENT", "FLAT"].includes(b.type)) throw unhandled("HttpMessageNotReadable: DiscountType");
      for (const k of ["validFrom", "validTo"]) if (b[k] != null && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(b[k])) throw unhandled("HttpMessageNotReadable: LocalDateTime");
      const errs = {};
      if (!b.code || !String(b.code).trim()) errs.code = "must not be blank";
      if (!b.type) errs.type = "must not be null";
      if (b.value == null) errs.value = "must not be null"; else if (!(b.value > 0)) errs.value = "must be greater than 0";
      if (Object.keys(errs).length) throw validation(errs);
    };
    const couponRules = (b) => {
      if (b.type === "PERCENT" && (b.value < 1 || b.value > 90)) throw apiEx("Percent coupons must be between 1 and 90");
      if (b.validFrom && b.validTo && b.validTo < b.validFrom) throw apiEx("validTo must be after validFrom");
    };
    if (req.method === "GET" && p === "/api/admin/coupons") return json(200, state.coupons);
    if (req.method === "POST" && p === "/api/admin/coupons") {
      const b = body();
      couponBinding(b);
      const code = String(b.code).trim().toUpperCase();
      if (state.coupons.some((c) => c.code.toUpperCase() === code)) throw apiEx(`Coupon code already exists: ${code}`);
      couponRules(b);
      const c = { couponId: state.nextCoupon++, code, type: b.type, value: b.value, minOrderPaise: b.minOrderPaise ?? null, maxDiscountPaise: b.maxDiscountPaise ?? null, usageLimit: b.usageLimit ?? null, usedCount: 0, validFrom: b.validFrom ?? null, validTo: b.validTo ?? null, active: b.active ?? true };
      state.coupons.push(c);
      return json(201, c);
    }
    if ((mm = m(/^\/api\/admin\/coupons\/([^/]+)$/)) && (req.method === "PUT" || req.method === "DELETE")) {
      const id = longVar(mm[1]);
      const b = req.method === "PUT" ? body() : null;
      if (b) couponBinding(b);
      const c = state.coupons.find((x) => x.couponId === id);
      if (!c) throw notFound("Coupon", "couponId", id);
      if (b) couponRules(b);
      if (req.method === "DELETE") { c.active = false; res.writeHead(204); return res.end(); }
      Object.assign(c, { type: b.type, value: b.value, minOrderPaise: b.minOrderPaise ?? null, maxDiscountPaise: b.maxDiscountPaise ?? null, usageLimit: b.usageLimit ?? null, validFrom: b.validFrom ?? null, validTo: b.validTo ?? null });
      if (b.active != null) c.active = b.active;
      return json(200, c);
    }

    throw unhandled("no handler");
  } catch (e) {
    if (snap) restore(snap);
    if (e instanceof HttpErr) return json(e.status, e.body);
    if (!(e instanceof Unhandled)) console.error(e);
    return unauthorized("/error");
  }
}).listen(PORT, () => console.log("CosmicPerfumes_Backend test double on", PORT));

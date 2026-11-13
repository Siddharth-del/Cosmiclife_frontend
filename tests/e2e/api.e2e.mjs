import crypto from "node:crypto";
import { API, RZP_SECRET, apiSignIn, check, failed, reset, serverState } from "./lib.mjs";

await reset();
const call = async (method, path, token, body, headers = {}) => {
  const r = await fetch(API + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {  }
  return { status: r.status, text, json, type: r.headers.get("content-type") ?? "" };
};
const note = (s) => console.log(`NOTE  ${s}`);
const a = (await apiSignIn("user1@example.com", "password1")).jwtToken;
const admin = (await apiSignIn("admin@example.com", "adminPass")).jwtToken;
const address = { buildingName: "Flat 4B, Rose Court", street: "MG Road, Indiranagar", city: "Bengaluru", state: "Karnataka", country: "India", pincode: "560038", phoneNumber: "9876543210" };

{
  check((await call("GET", "/api/admin/orders")).status === 401, "no token → admin endpoint 401");
  const wrongRole = await call("GET", "/api/admin/orders", a);
  check(wrongRole.status === 401 && /Full authentication/.test(wrongRole.json?.message), "customer on an admin endpoint → 401 boilerplate (the 403 is lost because /error isn't permitted)");
  check((await call("GET", "/api/public/bundles")).status === 401, "no Build Your Own Box endpoints (unknown path → 401)");
  check((await call("GET", "/api/orders/abc", a)).status === 401, "bad path value → 401");
  check((await call("GET", "/api/orders/999", a)).status === 404, "unknown order → 404 with a message");
  const signin = await call("POST", "/api/auth/signin", null, { email: "user1@example.com", password: "nope" });
  check(signin.status === 401 && signin.json?.message === "Invalid email or password", "wrong password → 401 with its own message");
  check((await call("GET", "/health")).json?.status === "UP", "GET /health is UP");
}

{
  const cookieThenHeader = await fetch(`${API}/api/orders`, { headers: { Cookie: "springBootEcom=", Authorization: `Bearer ${a}` } });
  check(cookieThenHeader.status === 401, "an empty leftover cookie overrides a valid Bearer header (why the storefront never sends cookies)");
  const r = await fetch(`${API}/api/auth/signin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "user1@example.com", password: "password1" }) });
  check(/springBootEcom=/.test(r.headers.get("set-cookie") ?? ""), "sign-in sets the springBootEcom cookie (ignored by the storefront: credentials 'omit')");
}

{
  const add = await call("POST", "/api/carts/products/2/quantity/3", a);
  check(add.status === 201 && add.json.products[0].quantity === 3, "POST …/quantity/3 → 201 and the cart");
  check((await call("PUT", "/api/cart/products/2/quantity/whatever", a)).status === 400, "unknown operation is read as +1 (here refused: only 3 in stock)");
  check((await call("POST", "/api/carts/products/5/quantity/1", a)).json?.message === "Hidden Draft is not available", "inactive product can't be added (400)");
  await call("POST", "/api/carts/products/2/quantity/2", admin);
  const aa = await call("POST", "/api/addresses", admin, { ...address, buildingName: "Admin House 1" });
  check((await call("POST", "/api/checkout", admin, { addressId: aa.json.addressId, paymentMethod: "COD" })).status === 201, "another shopper bought 2 Rose Attar");
  const down = await call("PUT", "/api/cart/products/2/quantity/delete", a);
  check(down.status === 400 && /Only 1 left/.test(down.json?.message), "lowering 3 → 2 with 1 in stock is refused: stock is checked on decreases too");
  const cart = (await call("GET", "/api/carts/users/cart", a)).json;
  const del = await call("DELETE", `/api/carts/${cart.cartId}/product/2`, a);
  check(del.status === 200 && del.text === "Rose Attar removed from cart" && del.type.startsWith("text/plain"), "DELETE answers with text, not the cart");
  check((await call("DELETE", `/api/carts/${cart.cartId}/product/1`, admin)).status === 404, "someone else's cart id → 404");
  const all = await call("GET", "/api/carts", a);
  check(all.status === 200 && Array.isArray(all.json), "GET /api/carts lists every cart");
  note("GET /api/carts is open to any signed-in customer; restrict it to ROLE_ADMIN in WebSecurityConfig.");
}

{
  const mine = (await call("POST", "/api/addresses", a, address)).json;
  const put = await call("PUT", `/api/addresses/${mine.addressId}`, a, { ...address, city: "Mysuru", state: "Kerala", phoneNumber: "9000000000" });
  check(put.status === 200 && put.json.city === "Mysuru" && put.json.state === "Karnataka" && put.json.phoneNumber === "9876543210", "PUT saves city etc. but keeps state and phone as first saved");
  check((await call("POST", "/api/addresses", a, { ...address, city: "Goa" })).status === 401, "an address failing the entity rules is a 401 (validated on save, not by @Valid)");
  const other = await call("GET", `/api/addresses/${mine.addressId}`, admin);
  check(other.status === 200, "GET /api/addresses/{id} works for any signed-in account (admin order pages use it)");
  note("Addresses have no ownership checks: any signed-in user can read, edit or delete any address by id, and GET /api/addresses lists all.");
}

{
  await call("POST", "/api/carts/products/3/quantity/1", a);
  const addr = (await call("GET", "/api/users/addresses", a)).json[0];
  const one = (await call("POST", "/api/checkout", a, { addressId: addr.addressId, paymentMethod: "RAZORPAY" })).json;
  const two = (await call("POST", "/api/checkout", a, { addressId: addr.addressId, paymentMethod: "RAZORPAY" })).json;
  check(one.orderId !== two.orderId, "checking out twice creates two orders (the storefront reuses the unpaid one itself)");
  const stock = (await serverState()).products.find((p) => p.productId === 3).stock;
  check(stock === 18, `each unpaid order reserves stock (${stock} of 20 left)`);
  await call("POST", "/api/carts/products/1/quantity/1", a);
  const pid = "pay_contract";
  const sig = crypto.createHmac("sha256", RZP_SECRET).update(`${two.razorpayOrderId}|${pid}`).digest("hex");
  const bad = await call("POST", "/api/payments/verify", a, { razorpay_order_id: two.razorpayOrderId, razorpay_payment_id: pid, razorpay_signature: "0".repeat(64) });
  check(bad.status === 400 && bad.json.message === "Payment verification failed", "forged signature → 400");
  const ok = await call("POST", "/api/payments/verify", a, { razorpay_order_id: two.razorpayOrderId, razorpay_payment_id: pid, razorpay_signature: sig });
  check(ok.json?.status === "PAID", "verified payment → PAID");
  check((await call("GET", "/api/carts/users/cart", a)).json.products.length === 0, "paying empties the whole cart, including what was added after checkout");
  check((await call("POST", "/api/payments/verify", admin, { razorpay_order_id: one.razorpayOrderId, razorpay_payment_id: pid, razorpay_signature: crypto.createHmac("sha256", RZP_SECRET).update(`${one.razorpayOrderId}|${pid}`).digest("hex") })).status === 400, "another customer verifying my order → 400");
  const order = (await call("GET", `/api/orders/${two.orderId}`, a)).json;
  check(/^FGX-\d{4}[0-9A-F]{8}$/.test(order.orderNumber), `orders carry an order number (${order.orderNumber})`);
  check((await call("GET", `/api/orders/${one.orderId}/invoice`, a)).status === 400, "no invoice while awaiting payment");
}

{
  check((await call("POST", "/api/auth/forgot/password?email=nobody@example.com")).status === 404, "unknown email → 404");
  const sent = await call("POST", "/api/auth/forgot/password?email=user1@example.com");
  check(sent.status === 200 && /OTP sent/.test(sent.text), "code sent");
  const { code } = await (await fetch(`${API}/__otp?email=user1@example.com`)).json();
  check((await call("POST", `/api/auth/verify-otp?email=user1@example.com&otp=000000`)).status === 400, "wrong code → 400 Invalid OTP");
  check((await call("POST", `/api/auth/verify-otp?email=user1@example.com&otp=${code}`)).text === "OTP Validate", "right code → OTP Validate");
  check((await call("POST", `/api/auth/verify-otp?email=user1@example.com&otp=${code}`)).status === 400, "a code works once");
  const mismatch = await call("POST", "/api/auth/reset-password?email=user1@example.com", null, { password: "abcdef", confirmPassword: "abcdeg" });
  check(mismatch.status === 200 && /do not match/.test(mismatch.text), "mismatched passwords → 200 with a message (the storefront checks first)");
  const bare = await call("POST", "/api/auth/reset-password?email=admin@example.com", null, { password: "adminPass", confirmPassword: "adminPass" });
  check(bare.status === 200, "reset-password needs only the email");
  note("reset-password doesn't check that a code was verified: anyone who knows an email can set that account's password. Require the verified OTP in ForgotServiceImpl.resetPassword.");
  await fetch(`${API}/__mail?down=1`);
  check((await call("POST", "/api/auth/forgot/password?email=user1@example.com")).status === 401, "mail server down → 401 boilerplate (the storefront shows a server error)");
  await fetch(`${API}/__mail?down=0`);
}

{
  const g = await call("PUT", "/api/admin/products/1/images/2/primary", admin);
  check(g.json?.image?.endsWith("p3.jpg") && g.json.images[0].imageId === 2, "set main image → it becomes `image` and moves first");
  const d = await call("DELETE", "/api/admin/products/1/images/2", admin);
  check(d.json?.image?.endsWith("p1.jpg") && d.json.images.length === 1, "deleting the main image promotes the next one");
  check((await call("DELETE", "/api/admin/products/2", admin)).status === 401, "a product in an order can't be deleted (foreign key → 401)");
  const users = await call("GET", "/api/admin/users?pageNumber=0&pageSize=20", admin);
  check(users.json?.content?.length === 2 && "userName" in users.json.content[0] && !("roles" in users.json.content[0]), "users page: { userId, userName, email } and no roles");
  check(typeof users.json.content[0].password === "string", "the UserDTO includes the password hash (the storefront strips it on arrival)");
  note("GET /api/admin/users returns each account's password hash. Drop `password` from UserDTO.");
  check((await call("GET", "/api/admin/users/adm", admin)).json?.content?.[0]?.email === "admin@example.com", "search by part of a username");
}

console.log(failed() ? `\n${failed()} FAILED` : "\nALL PASSED");
process.exit(failed() ? 1 : 0);

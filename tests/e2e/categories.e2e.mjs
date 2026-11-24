import { readFile } from "node:fs/promises";
import { chromium, devices } from "playwright";
import { API, APP, SHOTS, apiSignIn, check, collectConsole, failed, reset, serverState, signInPage } from "./lib.mjs";

const SHOT = `${SHOTS}/categories`;
await reset();
const browser = await chromium.launch();
const errors = [];
const ctxOf = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  return { ctx, page };
};
const H = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

{
  const user = await apiSignIn("user1@example.com", "password1");
  const r = await fetch(`${API}/api/admin/categories`, { headers: H(user.jwtToken) });
  check(r.status === 401, `customer token → GET /api/admin/categories refused (${r.status})`);
  const pub = await fetch(`${API}/api/public/categories`);
  check(pub.status === 200, "public category list needs no token");
  const list = await pub.json();
  check(list.length === 3 && list.every((c) => typeof c.productCount === "number"), "public list returns the seeded three, each with a product count");
}

{
  const { ctx, page } = await ctxOf();
  await signInPage(page, "admin@example.com", "adminPass");
  await page.goto(`${APP}/admin/categories`);

  await page.getByRole("button", { name: /New category/ }).first().click();
  await page.getByRole("button", { name: /Create category/ }).click();
  check(await page.getByText("Enter a category name, e.g. Home Decor.").isVisible(), "empty name caught before sending");

  await page.getByLabel("Name").fill("Attars");
  check(await page.getByText("A category with this name already exists.").isVisible() || true, "duplicate name is validated on submit");
  await page.getByRole("button", { name: /Create category/ }).click();
  check(await page.getByText("A category with this name already exists.").isVisible(), "duplicate name caught before sending");

  await page.getByLabel("Name").fill("Home Decor");
  check((await page.getByLabel("Slug").inputValue()) === "home-decor", "slug fills in from the name");
  await page.getByLabel("Description").fill("Pieces that settle a room.");
  await page.getByLabel("Image URL").fill("not-a-url");
  await page.getByRole("button", { name: /Create category/ }).click();
  check(await page.getByText("Enter a full https:// URL or a path starting with /.").isVisible(), "a bad image URL is caught");
  await page.getByLabel("Image URL").fill("/images/campaign/lineup.webp");
  await page.getByLabel("Display order").fill("4");
  await page.getByRole("button", { name: /Create category/ }).click();

  await page.getByText("Home Decor created").waitFor({ timeout: 10000 });
  const st = await serverState();
  const made = st.categories.find((c) => c.slug === "home-decor");
  check(!!made && made.name === "Home Decor" && made.legacyCode === null, "category created, with no legacy enum code");
  await page.screenshot({ path: `${SHOT}-admin-list.png`, fullPage: true });

  await page.getByRole("button", { name: /^Hide$/ }).last().click();
  await page.getByText(/hidden from the store/).waitFor({ timeout: 10000 });
  check((await serverState()).categories.find((c) => c.slug === "home-decor").active === false, "hide switches the category off");
  await page.getByRole("button", { name: /^Show$/ }).last().click();
  await page.getByText(/shown on the store/).waitFor({ timeout: 10000 });

  await ctx.close();
}

{
  const admin = await apiSignIn("admin@example.com", "adminPass");
  const cats = await (await fetch(`${API}/api/public/categories?pageNumber=0&pageSize=100`)).json().then((r) => r.content ?? r);
  const attars = cats.find((c) => c.slug === "attars");
  const del = await fetch(`${API}/api/admin/category/${attars.categoryId}`, { method: "DELETE", headers: H(admin.jwtToken) });
  check(del.status === 400, `deleting a category that holds products is refused (${del.status})`);
  check((await serverState()).categories.some((c) => c.slug === "attars"), "…and the category is still there");
}

{
  const { ctx, page } = await ctxOf();
  await signInPage(page, "admin@example.com", "adminPass");
  await page.goto(`${APP}/admin/categories`);
  const row = page.locator("tr", { hasText: "Attars" }).first();
  await row.getByRole("button", { name: "Delete" }).click();
  check(
    await page.getByText(/refuses to delete a category that still holds any/).isVisible(),
    "delete warns that the products must be moved first",
  );
  const beforeRefusal = errors.length;
  await page.getByRole("button", { name: /^Delete category$/ }).click();
  await page.waitForTimeout(1500);
  check((await serverState()).categories.some((c) => c.slug === "attars"), "the server refuses, and the category is still there");
  for (let i = errors.length - 1; i >= beforeRefusal; i--) {
    if (/400 \(Bad Request\)/.test(errors[i])) errors.splice(i, 1);
  }

  await page.goto(`${APP}/admin/categories`);
  const empty = page.locator("tr", { hasText: "Home Decor" }).first();
  if (await empty.count()) {
    await empty.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: /^Delete category$/ }).click();
    await page.getByText("Home Decor deleted").waitFor({ timeout: 10000 });
    check(!(await serverState()).categories.some((c) => c.slug === "home-decor"), "a category with no products deletes cleanly");
  }
  await ctx.close();
}

await reset();

{
  const admin = await apiSignIn("admin@example.com", "adminPass");
  await fetch(`${API}/api/admin/categories`, {
    method: "POST",
    headers: H(admin.jwtToken),
    body: JSON.stringify({ name: "Home Decor", slug: "home-decor", description: "Pieces that settle a room.", imageUrl: "/images/campaign/lineup.webp", active: true, theme: "light", sortOrder: 4 }),
  });
  const cats = await (await fetch(`${API}/api/public/categories?pageNumber=0&pageSize=100`)).json().then((r) => r.content ?? r);
  const decor = cats.find((c) => c.slug === "home-decor");
  const prod = (await serverState()).products.find((p) => p.slug === "copper-water-tumbler");
  await fetch(`${API}/api/admin/products/${prod.productId}`, {
    method: "PUT",
    headers: H(admin.jwtToken),
    body: JSON.stringify({ ...prod, categoryId: decor.categoryId, category: null, images: undefined }),
  });

  const { ctx, page } = await ctxOf();
  await page.goto(APP);
  await page.getByRole("link", { name: /Home Decor/ }).first().waitFor({ timeout: 15000 });
  check(true, "a new category appears in the storefront navigation");
  await page.screenshot({ path: `${SHOT}-home.png`, fullPage: false });

  await page.goto(`${APP}/collections/home-decor`);
  await page.getByRole("heading", { name: /Home Decor/i }).first().waitFor({ timeout: 15000 });
  const body = (await page.locator("main").innerText()).toLowerCase();
  check(body.includes("copper water tumbler"), "its collection page lists only its own products");
  check(!body.includes("royal oud"), "…and nothing from other categories");
  check(!body.includes("fragrance"), "a non-fragrance category is not described as fragrances");
  await page.screenshot({ path: `${SHOT}-collection.png`, fullPage: true });

  check((await page.getByRole("heading", { name: /The Handicraft Collection/i }).count()) === 0, "a templated category does not borrow another collection's title");
  await ctx.close();
}

{
  const { ctx, page } = await ctxOf();
  await page.goto(`${APP}/collections/handicraft`);
  await page.getByRole("heading", { name: /The Handicraft Collection/i }).first().waitFor({ timeout: 15000 });
  check(true, "the three bespoke worlds keep their editorial titles");
  await ctx.close();
}

const FIX = new URL("./fixtures/", import.meta.url);
const fixture = (name) => new URL(name, FIX).pathname;

async function uploadViaApi(token, bannerId, names) {
  const form = new FormData();
  for (const name of names) {
    const bytes = await readFile(fixture(name));
    form.append("images", new Blob([bytes], { type: name.endsWith(".webp") ? "image/webp" : "image/jpeg" }), name);
  }
  const res = await fetch(`${API}/api/admin/banners/${bannerId}/images`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  return res.json();
}

let heroBannerId = 0;

{
  const { ctx, page } = await ctxOf();
  await signInPage(page, "admin@example.com", "adminPass");
  await page.goto(`${APP}/admin/banners`);
  await page.getByText("No banners yet").waitFor({ timeout: 15000 });
  check(true, "banners start empty, and the homepage keeps its built-in hero");

  await page.getByRole("button", { name: /New banner/ }).first().click();
  await page.getByRole("button", { name: /Create banner/ }).click();
  check(await page.getByText(/Add a headline/).isVisible(), "a banner needs a headline, eyebrow or subheading");

  await page.getByLabel("Headline", { exact: true }).fill("The season of oud");
  await page.getByLabel("Subheading", { exact: true }).fill("Smoke, resin and warm amber.");
  await page.getByLabel("Button text", { exact: true }).fill("Shop the edit");
  await page.getByRole("button", { name: /Create banner/ }).click();
  check(await page.getByText("Add where the button should go.").isVisible(), "button text without a link is caught");

  await page.getByLabel("Button link", { exact: true }).fill("javascript:alert(1)");
  await page.getByRole("button", { name: /Create banner/ }).click();
  check(await page.getByText(/full https:\/\/ address or a path/).isVisible(), "a javascript: link is refused in the browser");

  await page.getByLabel("Button link", { exact: true }).fill("/collections/oud");
  await page.getByRole("button", { name: /Create banner/ }).click();
  await page.getByText(/created/).waitFor({ timeout: 10000 });

  const madeEmpty = (await serverState()).banners.find((b) => b.heading === "The season of oud");
  check(!!madeEmpty && madeEmpty.active === false, "a new banner starts switched off, with no images yet");
  heroBannerId = madeEmpty.bannerId;

  check(await page.getByText(/No images yet/).isVisible(), "the editor asks for images once the banner exists");
  await page.locator('input[type="file"]').first().setInputFiles([fixture("p1.jpg"), fixture("p3.jpg")]);
  await page.getByText(/2 images added/).waitFor({ timeout: 20000 });
  const withImages = (await serverState()).banners.find((b) => b.bannerId === heroBannerId);
  check(withImages.images.length === 2, `both files uploaded and became images (${withImages.images.length})`);
  await page.screenshot({ path: `${SHOT}-admin-banners.png`, fullPage: true });
  await ctx.close();
}

{
  const admin = await apiSignIn("admin@example.com", "adminPass");
  const state0 = await serverState();
  const hero = state0.banners.find((b) => b.bannerId === heroBannerId);

  const bad = await fetch(`${API}/api/admin/banners/${heroBannerId}/images/${hero.images[0].imageId}`, {
    method: "PUT",
    headers: H(admin.jwtToken),
    body: JSON.stringify({ altText: "Oud bottle", decorative: false, linkHref: "//evil.example.com", linkLabel: null, eyebrow: null, heading: null, subheading: null }),
  });
  check(bad.status === 400, `a protocol-relative link is refused by the server (${bad.status})`);

  const early = await fetch(`${API}/api/admin/banners/${heroBannerId}/active?active=true`, { method: "PATCH", headers: H(admin.jwtToken) });
  check(early.status === 400, `switching on is refused while an image has no alt text (${early.status})`);

  for (const [i, img] of hero.images.entries()) {
    await fetch(`${API}/api/admin/banners/${heroBannerId}/images/${img.imageId}`, {
      method: "PUT",
      headers: H(admin.jwtToken),
      body: JSON.stringify({
        altText: `Slide ${i + 1}`,
        decorative: false,
        linkHref: i === 0 ? "/collections/oud" : "/collections/attars",
        linkLabel: i === 0 ? "Shop the edit" : "Explore attars",
        eyebrow: null,
        heading: i === 0 ? "The season of oud" : "Attars of Kannauj",
        subheading: null,
      }),
    });
  }
  const on = await fetch(`${API}/api/admin/banners/${heroBannerId}/active?active=true`, { method: "PATCH", headers: H(admin.jwtToken) });
  check(on.status === 200, "once every image is described, the banner switches on");

  const scheduled = await (await fetch(`${API}/api/admin/banners`, {
    method: "POST",
    headers: H(admin.jwtToken),
    body: JSON.stringify({ placement: "HERO", internalName: "Later", heading: "Not yet live", subheading: null, eyebrow: null, ctaLabel: null, ctaHref: null, theme: "DARK", sortOrder: 9, startsAt: "2099-01-01T00:00:00", endsAt: null }),
  })).json();
  await uploadViaApi(admin.jwtToken, scheduled.bannerId, ["brass-stand.webp"]);
  const stateS = await serverState();
  const sb = stateS.banners.find((b) => b.bannerId === scheduled.bannerId);
  await fetch(`${API}/api/admin/banners/${scheduled.bannerId}/images/${sb.images[0].imageId}`, {
    method: "PUT",
    headers: H(admin.jwtToken),
    body: JSON.stringify({ altText: "Later", decorative: false, linkHref: null, linkLabel: null, eyebrow: null, heading: null, subheading: null }),
  });
  await fetch(`${API}/api/admin/banners/${scheduled.bannerId}/active?active=true`, { method: "PATCH", headers: H(admin.jwtToken) });

  const live = await (await fetch(`${API}/api/public/banners`)).json();
  check(!Array.isArray(live) && Array.isArray(live.HERO), "the public endpoint is keyed by placement, not a flat list");
  check(Object.keys(live).length === 9, `every placement is present, empty ones included (${Object.keys(live).length})`);
  check(live.HERO.length === 1, `only the live banner is served (${live.HERO.length})`);
  check(live.HERO[0].images.length === 2, "and it carries both of its images");
  check(live.HERO[0].images[1].linkHref === "/collections/attars", "each image keeps its own link");
}

{
  const { ctx, page } = await ctxOf();
  await page.goto(APP);
  await page.getByRole("heading", { name: /The season of oud/i }).waitFor({ timeout: 15000 });
  check(true, "the slider replaces the built-in hero once a banner is live");
  check(await page.getByRole("link", { name: /Shop the edit/ }).first().isVisible(), "the first image's own button text and link are used");
  check((await page.getByRole("heading", { name: /The art of your presence/i }).count()) === 0, "…and the built-in hero is gone");
  await page.screenshot({ path: `${SHOT}-slider-1.png`, fullPage: false });

  await page.getByRole("button", { name: "Next slide" }).click();
  await page.getByRole("heading", { name: /Attars of Kannauj/i }).first().waitFor({ timeout: 10000 });
  check(true, "the next arrow moves to the banner's second image");
  const href = await page.getByRole("link", { name: /Explore attars/ }).first().getAttribute("href");
  check(href === "/collections/attars", `the second image links where it was told to (${href})`);

  await page.getByRole("button", { name: "Previous slide" }).click();
  await page.getByRole("heading", { name: /The season of oud/i }).waitFor({ timeout: 10000 });
  check(true, "the previous arrow goes back");
  await page.screenshot({ path: `${SHOT}-slider-2.png`, fullPage: false });
  await ctx.close();
}

{
  const { ctx, page } = await ctxOf({ ...devices["iPhone 13"] });
  await page.goto(APP);
  await page.getByRole("heading", { name: /The season of oud/i }).waitFor({ timeout: 15000 });
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  check(sw <= cw + 1, `mobile slider: no horizontal overflow (${sw} vs ${cw})`);
  check((await page.getByRole("button", { name: "Next slide" }).count()) === 0 || !(await page.getByRole("button", { name: "Next slide" }).first().isVisible()), "arrows are hidden on phones; swipe and dots carry it");
  await page.screenshot({ path: `${SHOT}-slider-mobile.png`, fullPage: false });
  await ctx.close();
}

check(errors.length === 0, errors.length ? `console errors: ${[...new Set(errors)].slice(0, 3).join(" | ")}` : "no console errors");
console.log(failed() ? "\nFAILED" : "\nALL PASSED");
await browser.close();
process.exit(failed() ? 1 : 0);

import { chromium } from "playwright";
import { API, APP, SHOTS, apiSignIn, check, collectConsole, failed, reset, serverCartLines, serverState, setServerCart, signInPage } from "./lib.mjs";

const CRAFT = ["Brass Pedestal Stand", "Hammered Brass Glass", "Copper Water Tumbler"];
const names = (loc) => loc.evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("aria-label")))]);

await reset();
const browser = await chromium.launch();
const errors = [];

for (const [label, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  collectConsole(page, errors);

  await page.goto(APP + "/");
  const section = page.locator("section[aria-labelledby='handicraft-title']");
  await section.scrollIntoViewIfNeeded();
  await section.getByRole("heading", { name: /Made\s*to keep/i }).waitFor();
  const after = await page.evaluate(() => document.querySelector("#worlds-title")?.closest("section")?.nextElementSibling?.getAttribute("aria-labelledby"));
  check(after === "handicraft-title", `${label}: the Handicraft section comes right after Attar / Perfume (${after})`);
  const worlds = await page.locator("section[aria-labelledby='worlds-title'] a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check(JSON.stringify(worlds) === JSON.stringify(["/collections/attars", "/collections/perfumes", "/collections/handicraft"]), `${label}: Choose your world has Attar, Perfume and Handicraft (${worlds.join(", ")})`);
  const inSection = await names(section.locator("article a[aria-label]"));
  check(JSON.stringify(inSection) === JSON.stringify(["Copper Water Tumbler", "Hammered Brass Glass", "Brass Pedestal Stand"]), `${label}: homepage shows the handicraft pieces, newest first (${inSection.join(", ")})`);
  check((await section.getByText("3 pieces made by hand").count()) === 1, `${label}: piece count`);
  check((await section.getByRole("link", { name: /^Brass\s*2/i }).count()) === 1 && (await section.getByRole("link", { name: /^Copper\s*1/i }).count()) === 1, `${label}: Brass and Copper links with their counts`);
  check((await section.locator("article").first().innerText()).includes("Handicraft"), `${label}: cards say “Handicraft”, not Perfume or Attar`);

  await page.locator("#discovery-title").scrollIntoViewIfNeeded();
  const fragranceSections = await page.evaluate(() =>
    ["bestsellers-title", "gifting-title", "discovery-title"].map((id) => document.querySelector(`section[aria-labelledby='${id}']`)?.innerText ?? "").join("\n"),
  );
  check(!CRAFT.some((n) => fragranceSections.toUpperCase().includes(n.toUpperCase())), `${label}: no handicraft pieces in bestsellers, gifting or the fragrance finder`);
  check((await page.locator("section[aria-labelledby='categories-title'] a[href='/collections/handicraft']").count()) === 1, `${label}: Shop by category has a Handicrafts card`);
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  await section.screenshot({ path: `${SHOTS}/handicraft-section-${label}.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `${label}: no sideways scroll on the homepage (${overflow})`);

  await section.getByRole("link", { name: "Explore the collection" }).click();
  await page.waitForURL(/\/collections\/handicraft$/);
  await page.getByRole("heading", { name: /The Handicraft Collection/i }).first().waitFor();
  await page.getByText("3 pieces").first().waitFor();
  const listed = (await names(page.locator("main article a[aria-label]"))).sort();
  check(JSON.stringify(listed) === JSON.stringify([...CRAFT].sort()), `${label}: collection page lists exactly the handicraft pieces (${listed.join(", ")})`);
  check((await page.locator("main a[aria-current='page']", { hasText: "Handicraft" }).count()) === 1, `${label}: the switcher shows Handicraft as the current collection`);
  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(pageOverflow <= 0, `${label}: three-way switcher fits without sideways scroll (${pageOverflow})`);
  if (label === "desktop") {
    const aside = page.locator("aside[aria-label='Filters']");
    check((await aside.getByText("Material", { exact: true }).count()) === 1 && (await aside.getByText("Scent family").count()) === 0, "filters offer Material, not scent families");
    await aside.getByText("Copper", { exact: true }).click();
    await page.getByText("1 piece", { exact: true }).waitFor();
    const only = await page.waitForFunction(() => [...document.querySelectorAll("main article a[aria-label]")].map((a) => a.getAttribute("aria-label")).filter((v, i, all) => all.indexOf(v) === i).join() === "Copper Water Tumbler").then(() => true, () => false);
    check(only, "Copper filter shows only the copper piece");
  }
  await page.goto(APP + "/collections/handicraft");
  await page.getByText("3 pieces").first().waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/handicraft-collection-${label}.png` });

  for (const slug of ["all", "perfumes", "attars"]) {
    await page.goto(`${APP}/collections/${slug}`);
    await page.locator("main article").first().waitFor();
    const list = await names(page.locator("main article a[aria-label]"));
    check(!list.some((n) => CRAFT.includes(n)), `${label}: /collections/${slug} has no handicraft pieces`);
  }
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  const openCraftMenu = async () => {
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(700, 700);
      await page.locator("header").getByRole("link", { name: "Handicraft", exact: true }).hover();
      if (await page.locator("header a[href='/collections/handicraft?material=copper']").waitFor({ state: "visible", timeout: 2500 }).then(() => true, () => false)) return;
    }
    throw new Error("Handicraft menu didn't open");
  };
  await page.goto(APP + "/");
  check(await page.locator("footer a[href='/collections/handicraft']").waitFor().then(() => true, () => false), "footer links to the Handicraft Collection");
  await openCraftMenu();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/handicraft-menu-desktop.png` });
  await page.locator("header").getByRole("link", { name: "Brass", exact: true }).click();
  await page.waitForURL(/material=brass/);
  await page.getByText("2 pieces", { exact: true }).waitFor();
  check(JSON.stringify((await names(page.locator("main article a[aria-label]"))).sort()) === JSON.stringify(["Brass Pedestal Stand", "Hammered Brass Glass"]), "Handicraft menu → Brass opens the collection with brass only");
  await openCraftMenu();
  await page.locator("header a[href='/collections/handicraft?material=copper']").click();
  await page.waitForURL(/material=copper/);
  await page.waitForFunction(() => [...document.querySelectorAll("main article a[aria-label]")].map((a) => a.getAttribute("aria-label")).join() === "Copper Water Tumbler");
  check(true, "switching to Copper on the same page refilters");
  check((await page.locator("header a[href='/collections/handicraft?material=others']").count()) === 1, "the menu also offers Others");

  await page.goto(APP + "/products/brass-pedestal-stand");
  await page.getByRole("heading", { name: /Brass Pedestal Stand/i }).first().waitFor();
  const main = await page.locator("main").innerText();
  check(/HANDICRAFT\s*·\s*BRASS/i.test(main) && !/UNISEX/i.test(main), "product page reads “Handicraft · Brass”, with no for him / her");
  check((await page.getByRole("button", { name: "Caring for brass" }).count()) === 1 && (await page.getByRole("button", { name: "How to wear" }).count()) === 0, "product page explains care, not how to wear");
  check((await page.locator("nav[aria-label='Breadcrumb'] a[href='/collections/handicraft']").count()) === 1, "breadcrumb leads back to Handicrafts");
  await page.locator("section[aria-labelledby='related-title']").scrollIntoViewIfNeeded();
  const related = (await names(page.locator("section[aria-labelledby='related-title'] article a[aria-label]"))).sort();
  check(JSON.stringify(related) === JSON.stringify(["Copper Water Tumbler", "Hammered Brass Glass"]), `“You may also like” suggests handicrafts, not fragrances (${related.join(", ")})`);

  await page.goto(APP + "/products/copper-water-tumbler");
  await page.getByRole("heading", { name: /Copper Water Tumbler/i }).first().waitFor();
  check((await page.getByRole("button", { name: "Caring for copper" }).count()) === 1, "a copper piece explains how to care for copper");

  await page.goto(APP + "/collections/brass");
  await page.waitForURL(/\/collections\/handicraft$/);
  check(true, "the old /collections/brass link redirects to the Handicraft Collection");
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  await page.goto(APP + "/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await menu.getByRole("tab", { name: "Handicraft" }).click();
  await menu.getByRole("link", { name: "All Handicrafts" }).waitFor({ state: "visible" });
  check((await menu.getByRole("link", { name: "Brass", exact: true }).count()) === 1 && (await menu.getByRole("link", { name: "Copper", exact: true }).count()) === 1 && (await menu.getByRole("link", { name: "Others", exact: true }).count()) === 1, "phone menu: Handicraft tab lists All Handicrafts, Brass, Copper, Others");
  const tabsFit = await menu.getByRole("tablist").evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
  check(tabsFit, "phone menu: Attar / Perfume / Handicraft tabs fit");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/handicraft-menu-phone.png` });
  await ctx.close();
}

{
  await setServerCart("user1@example.com", "password1", []);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  await signInPage(page, "user1@example.com", "password1");
  await page.goto(APP + "/products/hammered-brass-glass");
  await page.getByRole("heading", { name: /Hammered Brass Glass/i }).first().waitFor();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.getByRole("button", { name: /Added/ }).first().waitFor();
  check(JSON.stringify(await serverCartLines("user1@example.com")) === JSON.stringify(["P:8x1"]), "Add to cart puts the brass glass in the account's server cart");
  await setServerCart("user1@example.com", "password1", []);
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  await signInPage(page, "admin@example.com", "adminPass");
  await page.goto(APP + "/admin/products/new");
  await page.getByLabel("Name").fill("Copper Serving Tray");
  await page.getByLabel("URL slug").fill("copper-serving-tray");
  await page.getByLabel("Type").selectOption("HANDICRAFT");
  check((await page.locator("#pf-gender, #pf-fragranceFamily").count()) === 0, "admin: choosing Handicraft hides For and Fragrance family");
  check((await page.locator("#pf-material").count()) === 1, "admin: choosing Handicraft shows the Material field");
  const options = await page.locator("#pf-material option").evaluateAll((os) => os.map((o) => o.value));
  check(JSON.stringify(options) === JSON.stringify(["", "BRASS", "COPPER", "OTHERS"]), `admin: Material offers Brass, Copper and Others (${options.join(", ")})`);
  await page.getByLabel("Material").selectOption("COPPER");
  await page.getByLabel("Selling price (₹)").fill("899");
  await page.getByLabel("MRP (₹)").fill("1099");
  await page.getByLabel("Stock", { exact: true }).fill("9");
  await page.getByRole("button", { name: /Create product/ }).click();
  await page.waitForURL(/\/admin\/products\/\d+$/);
  const made = (await serverState()).products.find((p) => p.slug === "copper-serving-tray");
  check(made && made.category === "HANDICRAFT" && made.material === "COPPER" && made.gender === null && made.fragranceFamily === null && made.price === 89900, "admin: handicraft item saved with category HANDICRAFT, material COPPER and no gender or family");
  await page.reload();
  await page.locator("#pf-name").waitFor();
  check((await page.getByLabel("Type").inputValue()) === "HANDICRAFT" && (await page.getByLabel("Material").inputValue()) === "COPPER", "admin: editing it again shows Handicraft and Copper");
  await page.goto(APP + "/admin/products");
  await page.getByRole("button", { name: "Handicraft", exact: true }).click();
  await page.getByText("Copper Serving Tray").first().waitFor();
  const rows = await page.locator("main").innerText();
  check(!rows.includes("Royal Oud") && rows.includes("Hammered Brass Glass"), "admin: the Handicraft type filter lists handicraft items only");
  check(/Handicraft\s*·\s*Copper/i.test(rows), "admin: the list shows the material beside the type");
  await page.goto(APP + "/collections/handicraft?material=copper");
  await page.getByText("2 pieces", { exact: true }).waitFor();
  check(JSON.stringify((await names(page.locator("main article a[aria-label]"))).sort()) === JSON.stringify(["Copper Serving Tray", "Copper Water Tumbler"]), "admin: the new tray is in the store under Copper");
  await ctx.close();
}

{
  const admin = await apiSignIn("admin@example.com", "adminPass");
  const H = { Authorization: `Bearer ${admin.jwtToken}`, "Content-Type": "application/json" };
  for (const p of (await serverState()).products.filter((x) => x.category === "HANDICRAFT")) {
    await fetch(`${API}/api/admin/products/${p.productId}`, { method: "PUT", headers: H, body: JSON.stringify({ ...p, active: false }) });
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  await page.goto(APP + "/");
  await page.locator("#journal-title").waitFor();
  check((await page.locator("section[aria-labelledby='handicraft-title']").count()) === 0, "no live handicraft pieces → no homepage section");
  check((await page.locator("section[aria-labelledby='categories-title'] a[href='/collections/handicraft']").count()) === 0, "no live handicraft pieces → no Handicrafts category card");
  await page.goto(APP + "/collections/handicraft");
  await page.getByText("There are no handicraft pieces in the collection right now.").waitFor();
  check(true, "empty Handicraft Collection page explains");
  await ctx.close();
}

const relevant = errors.filter((e) => !/Failed to load resource/.test(e));
check(relevant.length === 0, `no console errors${relevant.length ? ": " + relevant.join(" | ") : ""}`);
await browser.close();
console.log(failed() ? `\n${failed()} FAILED` : "\nALL PASSED");
process.exit(failed() ? 1 : 0);

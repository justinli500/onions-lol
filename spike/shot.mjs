import { chromium } from "playwright";

const base = process.env.BASE || "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1320, height: 900 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 160));
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 160)));

for (const [name, path] of [
  ["landing", "/"],
  ["trade", "/trade"],
]) {
  try {
    await page.goto(base + path, { waitUntil: "networkidle", timeout: 30000 });
  } catch (e) {
    console.log(name, "goto:", e.message);
  }
  await page.waitForTimeout(1500);
  // scroll through to trigger whileInView reveals, then back to top
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y <= h; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/onions-${name}.png`, fullPage: true });
  console.log(`${name} -> /tmp/onions-${name}.png`);
}
if (errors.length) {
  console.log("\nconsole/page errors:");
  for (const e of [...new Set(errors)].slice(0, 12)) console.log("  -", e);
} else {
  console.log("\nno console/page errors");
}
await browser.close();

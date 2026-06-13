import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("PAGEERROR:", (e.stack || e.message || "").slice(0, 700)));
await p.goto("http://localhost:3000/trade", { waitUntil: "networkidle", timeout: 30000 }).catch(()=>{});
await p.waitForTimeout(3500);
await b.close();

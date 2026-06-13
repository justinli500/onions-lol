import { chromium } from "playwright";
import { buildSignedDeposit, hostedUrl } from "./sign.mjs";

const oneTap = process.env.ONE_TAP === "1";
const signed = buildSignedDeposit({
  amount: 25,
  chainId: 84532,
  address: "0x" + "a".repeat(40),
  token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  encoding: "der",
});
const url = hostedUrl(signed) + (oneTap ? "&enableFullWidget=false" : "");

const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 440, height: 720 } });
const apiErr = [];
p.on("response", async (r) => {
  if (r.url().includes("api-sandbox.blink.cash") && r.status() >= 400) {
    apiErr.push(`${r.status()} ${r.url().split("blink.cash")[1]}`);
  }
});
await p.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch((e) => console.log("goto:", e.message));
await p.waitForTimeout(6000);
const out = oneTap ? "/tmp/blink-onetap.png" : "/tmp/blink-fullwidget.png";
await p.screenshot({ path: out, fullPage: true });
const text = ((await p.textContent("body").catch(() => "")) || "").replace(/\s+/g, " ").trim();
console.log(`mode=${oneTap ? "one-tap" : "full-widget"} -> ${out}`);
console.log("VISIBLE TEXT:", text.slice(0, 1400));
console.log("API 4xx:", [...new Set(apiErr)].join(", ") || "(none)");
await b.close();

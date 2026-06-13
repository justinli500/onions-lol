import { chromium } from "playwright";
import { buildSignedDeposit, hostedUrl } from "./sign.mjs";

const signed = buildSignedDeposit({
  amount: 25,
  chainId: 84532,
  address: "0x" + "a".repeat(40),
  token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  encoding: "der",
});
const url = hostedUrl(signed) + "&enableFullWidget=false";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 440, height: 720 } });
const page = await context.newPage();

// virtual WebAuthn authenticator so "Create a passkey" auto-succeeds
const client = await context.newCDPSession(page);
await client.send("WebAuthn.enable");
await client.send("WebAuthn.addVirtualAuthenticator", {
  options: {
    protocol: "ctap2",
    transport: "internal",
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
    automaticPresenceSimulation: true,
  },
});

const api = [];
page.on("response", async (r) => {
  const u = r.url();
  if (u.includes("api-sandbox.blink.cash")) {
    let b = "";
    try { b = (await r.text()).slice(0, 200); } catch {}
    api.push(`${r.status()} ${u.split("blink.cash")[1]}  ${b.replace(/\s+/g, " ")}`);
  }
});

await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch((e) => console.log("goto:", e.message));
await page.waitForTimeout(3000);
const before = ((await page.textContent("body").catch(() => "")) || "").replace(/\s+/g, " ");
console.log("STEP1 has 'Create a passkey':", /create a passkey/i.test(before));

await page.getByText(/create a passkey/i).first().click({ timeout: 8000 }).catch((e) => console.log("click:", e.message));
await page.waitForTimeout(8000);

await page.screenshot({ path: "/tmp/blink-onetap-after.png", fullPage: true });
const after = ((await page.textContent("body").catch(() => "")) || "").replace(/\s+/g, " ").trim();
console.log("\nAFTER-PASSKEY VISIBLE TEXT:\n", after.slice(0, 1200));
console.log("\nAPI CALLS:");
for (const a of api.slice(-18)) console.log("  ", a);
await browser.close();

// Headless probe of Blink's sandbox hosted flow. Loads pay-sandbox.blink.cash
// with a signed payload (no wallet / no funds) and captures the backend calls so
// we can see (a) which signature encoding the verifier accepts, and (b) what the
// flow says about chainId 84532 / the token. This is the autonomous half of the
// Phase 1 gate; the only thing it can't prove is USDC physically landing.
import { chromium } from 'playwright';
import { buildSignedDeposit, hostedUrl } from './sign.mjs';

const ADDRESS = '0x' + 'a'.repeat(40);
const TOKEN_GUESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Circle Base Sepolia USDC (a GUESS to be confirmed)

async function probe(encoding) {
  const signed = buildSignedDeposit({ amount: 25, chainId: 84532, address: ADDRESS, token: TOKEN_GUESS, encoding });
  const url = hostedUrl(signed) + (process.env.ONE_TAP ? "&enableFullWidget=false" : "");
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const api = [];
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('blink.cash') && !/\.(js|css|png|svg|woff2?|ico|map)(\?|$)/.test(u) && new URL(u).host !== 'pay-sandbox.blink.cash') {
      let body = '';
      try { body = (await res.text()).slice(0, 2500); } catch {}
      api.push({ status: res.status(), method: res.request().method(), url: u, body });
    }
  });
  const consoleErrs = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });

  console.log(`\n================ encoding = ${encoding} ================`);
  console.log('hosted url:', url.slice(0, 120) + '...');
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => console.log('goto:', e.message));
  await page.waitForTimeout(4000);

  // Heuristic page-state signals
  const bodyText = (await page.textContent('body').catch(() => '')) || '';
  const lower = bodyText.toLowerCase();
  const signals = {
    mentionsInvalidSig: /invalid signature|signature.*(invalid|verif)|unauthorized|bad request/.test(lower),
    mentionsUnsupportedChain: /unsupported|not supported|invalid chain/.test(lower),
    mentionsBaseSepolia: /base sepolia|sepolia|84532/.test(lower),
    mentionsAmount: /\$?25(\.00)?\b/.test(bodyText),
    mentionsConnectWallet: /connect|wallet|deposit/.test(lower),
  };

  console.log('--- backend API calls (non-static, non-page-host) ---');
  for (const c of api) console.log(`[${c.status}] ${c.method} ${c.url}\n      ${c.body.replace(/\n/g, ' ')}`);
  if (api.length === 0) console.log('(none captured — flow may use postMessage/websocket only)');
  console.log('--- page signals ---', JSON.stringify(signals));
  if (consoleErrs.length) console.log('--- console errors ---\n' + consoleErrs.slice(0, 8).join('\n'));
  console.log('--- body text (first 500 chars) ---\n' + bodyText.replace(/\s+/g, ' ').trim().slice(0, 500));

  await browser.close();
  return { encoding, api, signals };
}

const der = await probe('der');
const results = [der];
if (process.env.ALL === '1') results.push(await probe('ieee-p1363'));

console.log('\n================ VERDICT ================');
const summarize = (r) => {
  const ok2xx = r.api.some((c) => c.status >= 200 && c.status < 300);
  const sigInvalid = r.api.some((c) => /MERCHANT_SIGNATURE_INVALID/.test(c.body));
  const session = r.api.find((c) => c.status === 201 && /sessionId/.test(c.body));
  return `${r.encoding}: api2xx=${ok2xx} sigVerifyFailed=${sigInvalid} sessionCreated=${!!session}`;
};
for (const r of results) console.log(summarize(r));

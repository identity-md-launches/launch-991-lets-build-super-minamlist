// Production-export validation. All transaction tests use a mocked RPC and wallet.
// Node 24+ strips the TypeScript annotations in the verified ABI.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { decodeFunctionData, encodeFunctionResult, erc20Abi, parseAbi, parseEther } from 'viem';
import { askOracleAbi as abi } from '../src/contracts/askOracleAbi.ts';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'artifacts');
await mkdir(output, { recursive: true });
const CONTRACT = '0x7c2a56beeca74a75b01054702d1195bfa72124f0';
const TOKEN = '0x5F7Bb59365ce557C26dbcAa4EE9d39A4b95B7127';
const INTAKE = '0x1397434cd35e8a9C8aC312A61D3A285EB31dea56';
const OWNER = '0x047F606fD5b2BaA5f5C6c4aB8958E45CB6B054B7';
const USER = '0x1111111111111111111111111111111111111111';
const ACTION = `0x${'ab'.repeat(32)}`;
const intakeAbi = parseAbi(['function priceOf(bytes32 action, address asset) view returns (uint256)']);
const now = BigInt(Math.floor(Date.now() / 1000));
const state = { allowance: 0n, balance: parseEther('10'), price: parseEther('0.5'), panel: 50, quorum: 40, validity: 86400, signer: OWNER, token: TOKEN, intake: INTAKE, action: ACTION, count: 12n, calls: [], failed: false, receiptStatus: '0x1' };
const records = new Map(Array.from({ length: 12 }, (_, i) => {
  const id = BigInt(i + 1), status = i === 0 || i === 9 ? 0 : i === 8 ? 2 : 1;
  const text = i === 11 ? 'Has Robinhood Chain produced a block in the last hour?' : i === 10 ? 'Did the oracle panel reach unanimous agreement?' : `Is public question ${id} ready for verification?`;
  return [id, [USER, text, status, i % 2 === 1, 43, 40, 50, i === 0 ? now - 90000n : now - 3600n, status === 1 ? now - 1000n : 0n]];
}));
let txNumber = 0;
function decode(tx) { return decodeFunctionData({ abi: tx.to.toLowerCase() === CONTRACT ? abi : erc20Abi, data: tx.data }); }
function send(tx) {
  const call = decode(tx); state.calls.push({ to: tx.to, ...call });
  if (state.receiptStatus === '0x1') {
    if (call.functionName === 'approve') state.allowance = call.args[1];
    if (call.functionName === 'ask') { state.count++; state.allowance -= state.price; state.balance -= state.price; records.set(state.count, [USER, call.args[0], 0, false, 0, 0, 0, now, 0n]); }
    if (call.functionName === 'setPanel') [state.panel, state.quorum, state.validity] = call.args;
    if (call.functionName === 'setSigner') state.signer = call.args[0];
    if (call.functionName === 'setProtocol') [state.intake, state.token, state.action] = call.args;
    if (call.functionName === 'markUnanswered') records.get(call.args[0])[2] = 2;
  }
  txNumber++; return `0x${txNumber.toString(16).padStart(64, '0')}`;
}
function rpc(request) {
  const { method, params = [], id } = request;
  let result;
  if (method === 'eth_chainId') result = '0x1237';
  else if (method === 'eth_blockNumber') result = '0x100';
  else if (method === 'eth_getTransactionReceipt') result = { transactionHash: params[0], blockHash: `0x${'ab'.repeat(32)}`, blockNumber: '0x100', transactionIndex: '0x0', from: USER, to: CONTRACT, cumulativeGasUsed: '0x5208', gasUsed: '0x5208', effectiveGasPrice: '0x1', contractAddress: null, logs: [], logsBloom: `0x${'00'.repeat(256)}`, status: state.receiptStatus, type: '0x2' };
  else if (method === 'eth_call') {
    const address = params[0].to.toLowerCase();
    const targetAbi = address === CONTRACT ? abi : address === state.intake.toLowerCase() ? intakeAbi : erc20Abi;
    const { functionName, args } = decodeFunctionData({ abi: targetAbi, data: params[0].data });
    const values = { owner: OWNER, imd: state.token, intake: state.intake, action: state.action, oracleSigner: state.signer, panelSize: state.panel, quorum: state.quorum, validForSeconds: state.validity, count: state.count, latestAnswered: 12n, ANSWER_TIMEOUT: 86400n, priceOf: state.price, decimals: 18, symbol: 'IMD', balanceOf: state.balance, allowance: state.allowance, approve: true, ask: state.count + 1n };
    if (functionName === 'question' && !records.has(args[0])) return { jsonrpc: '2.0', id, error: { code: 3, message: 'UnknownQuestion: check the question ID.' } };
    result = encodeFunctionResult({ abi: targetAbi, functionName, result: functionName === 'question' ? records.get(args[0]) : values[functionName] });
  } else throw new Error(`Unhandled test RPC ${method}`);
  return { jsonrpc: '2.0', id, result };
}

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/preview/')) throw new Error('Subpath required');
    const relative = pathname.slice('/preview/'.length) || 'index.html';
    if (relative.includes('..')) throw new Error('Invalid path');
    const file = join(root, 'dist', relative);
    const body = await readFile(file);
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' })[extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch { res.statusCode = 404; res.end('Not found'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/preview/`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const checks = [], browserErrors = [], resourcesFailed = [];
function pass(name) { checks.push(name); console.log(`PASS ${name}`); }
async function visible(page, text) { await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 }); }
async function navigate(page, hash) { await page.goto(`${base}#${hash}`); }
async function click(page, name) { await page.getByRole('button', { name, exact: true }).click(); }
async function connect(page) { await click(page, 'Connect wallet'); await click(page, 'Browser wallet'); }
async function noOverflow(page, width) { await page.setViewportSize({ width, height: 950 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); }
let report;
try {
  // Live, read-only network check. No provider is injected into this browser context.
  const live = await browser.newPage({ viewport: { width: 1440, height: 1100 }, ignoreHTTPSErrors: true });
  live.setDefaultTimeout(12000);
  await live.goto(base);
  await visible(live, '0.5 IMD');
  await live.screenshot({ path: join(output, 'desktop.png'), fullPage: true });
  await noOverflow(live, 390);
  await live.screenshot({ path: join(output, 'mobile.png'), fullPage: true });
  await noOverflow(live, 320);
  await live.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  await visible(live, 'No browser wallet detected');
  await live.keyboard.press('Escape');
  assert.equal(await live.locator('dialog').count(), 0);
  pass('Live production export: contract fee, empty archive, 320/390px reflow, missing-wallet recovery');
  await live.close();

  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  context.setDefaultTimeout(12000);
  await context.exposeBinding('sendMockTransaction', (_source, tx) => send(tx));
  await context.addInitScript(({ user }) => {
    const listeners = {};
    window.__wallet = { account: user, chain: '0x1', reject: false, connected: false, emit: (event, value) => (listeners[event] || []).forEach(fn => fn(value)) };
    window.ethereum = {
      on: (event, fn) => (listeners[event] ||= []).push(fn),
      removeListener: (event, fn) => { listeners[event] = (listeners[event] || []).filter(f => f !== fn); },
      request: async ({ method, params }) => {
        const w = window.__wallet;
        if (method === 'eth_requestAccounts') { w.connected = true; return [w.account]; }
        if (method === 'eth_accounts') return w.connected ? [w.account] : [];
        if (method === 'eth_chainId') return w.chain;
        if (method === 'wallet_switchEthereumChain') { w.chain = params[0].chainId; w.emit('chainChanged', w.chain); return null; }
        if (method === 'eth_sendTransaction') { if (w.reject) { w.reject = false; throw Object.assign(new Error('User rejected the request'), { code: 4001 }); } return window.sendMockTransaction(params[0]); }
        throw new Error(`Unhandled wallet method ${method}`);
      }
    };
  }, { user: USER });
  await context.route('https://rpc.mainnet.chain.robinhood.com/**', async route => {
    if (state.failed) return route.fulfill({ status: 503, body: 'Temporarily unavailable' });
    try {
      const data = route.request().postDataJSON();
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(Array.isArray(data) ? data.map(rpc) : rpc(data)) });
    } catch (e) { console.error(e); throw e; }
  });
  const page = await context.newPage();
  page.on('pageerror', e => browserErrors.push(e.message));
  page.on('requestfailed', req => { if (req.url().startsWith(base)) resourcesFailed.push(req.url()); });
  await page.goto(base);
  await visible(page, '0.5 IMD');
  await visible(page, 'Has Robinhood Chain produced');
  assert.equal(await page.evaluate(() => document.fonts.check('400 14px "IBM Plex Mono"')), true);
  assert.equal(await page.evaluate(() => document.fonts.check('500 14px "IBM Plex Mono"')), true);
  pass('Mocked public data and both bundled font weights load at /preview/');

  // Keyboard focus, invalid field, example insertion, and UTF-8 / control validation.
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content');
  await page.keyboard.press('Enter');
  await click(page, 'Connect wallet to ask');
  await click(page, 'Browser wallet');
  await visible(page, 'Your wallet is on another network');
  await click(page, 'Switch network');
  await visible(page, 'Balance: 10 IMD');
  pass('Empty-draft wallet connection and wrong-chain switching');
  await page.getByRole('button', { name: 'Approve 0.5 IMD' }).click();
  await visible(page, 'Write a yes/no question');
  assert.equal(await page.locator('#question').getAttribute('aria-invalid'), 'true');
  await page.locator('#question').fill('🙂'.repeat(126));
  await page.getByRole('button', { name: 'Approve 0.5 IMD' }).click();
  await visible(page, 'Keep your question within 500 UTF-8 bytes');
  await page.locator('#question').fill('Line one\nLine two?');
  await page.getByRole('button', { name: 'Approve 0.5 IMD' }).click();
  await visible(page, 'Use a single line');
  await page.getByRole('button', { name: 'Insert an example' }).click();
  assert.ok((await page.locator('#question').inputValue()).endsWith('?'));
  pass('Keyboard skip link, field focus, empty/UTF-8/control validation, example insertion');

  await page.locator('#question').fill('Can a question be verified on Robinhood Chain?');
  await page.getByRole('button', { name: 'Approve 0.5 IMD' }).click();
  await visible(page, 'Approve the question fee');
  assert.ok((await page.locator('dialog').innerText()).includes(CONTRACT));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').count(), 0);
  assert.ok((await page.evaluate(() => document.activeElement.textContent)).includes('Approve 0.5 IMD'));
  pass('Approval review shows spender and returns focus on Escape');
  await page.getByRole('button', { name: 'Approve 0.5 IMD' }).click();
  await page.getByRole('button', { name: 'Approve fee' }).click();
  await visible(page, 'Approval confirmed');
  assert.equal(state.calls[0].functionName, 'approve');
  assert.equal(state.calls[0].to.toLowerCase(), TOKEN.toLowerCase());
  assert.equal(state.calls[0].args[0].toLowerCase(), CONTRACT);
  assert.equal(state.calls[0].args[1], parseEther('0.5'));
  pass('Exact-fee ERC-20 approval, target/spender/calldata assertions, receipt success');
  await page.getByRole('button', { name: 'Submit question' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit question' }).click();
  await visible(page, 'Question confirmed onchain');
  assert.equal(state.calls[1].functionName, 'ask');
  assert.deepEqual(state.calls[1].args, ['Can a question be verified on Robinhood Chain?']);
  await visible(page, 'Can a question be verified on Robinhood Chain?');
  pass('ask(string) simulation/send/receipt and automatic archive navigation');

  await page.getByRole('searchbox', { name: 'Search this page' }).fill('no match xyz');
  await visible(page, 'No matching questions');
  await click(page, 'Clear filters');
  await page.getByRole('combobox', { name: 'Filter questions' }).selectOption('answered');
  assert.ok((await page.locator('.question-row').count()) > 0);
  assert.equal(await page.locator('.question-row .state-0').count(), 0);
  await page.getByRole('combobox', { name: 'Filter questions' }).selectOption('all');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(output, 'browse-mocked.png'), fullPage: true });
  await noOverflow(page, 320);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(output, 'browse-mobile-mocked.png'), fullPage: true });
  await noOverflow(page, 1440);
  await click(page, 'Older →');
  await visible(page, 'Page 2');
  await page.locator('.question-row').first().waitFor();
  await click(page, '← Newer');
  await visible(page, 'Page 1');
  await page.getByLabel('Have a question ID?').fill('12');
  await click(page, 'Find question →');
  await visible(page, 'Panel agreement');
  await visible(page, '43 / 50');
  pass('Archive search/clear/status filter, older/newer pagination, question ID lookup and answer detail');

  await navigate(page, '/question/1');
  await page.getByRole('button', { name: 'Mark unanswered', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mark unanswered' }).click();
  await visible(page, 'Contract update confirmed');
  await visible(page, 'No answer was delivered within');
  assert.equal(state.calls.at(-1).functionName, 'markUnanswered');
  pass('Expired pending question becomes unanswered after a confirmed transaction');
  await navigate(page, '/question/999');
  await visible(page, 'Question unavailable');
  pass('Unknown question ID has an error and retry');

  await navigate(page, '/admin');
  await visible(page, 'Owner access required');
  assert.equal(await page.locator('.admin-card').count(), 0);
  await page.evaluate(owner => { window.__wallet.account = owner; window.__wallet.emit('accountsChanged', [owner]); }, OWNER);
  await visible(page, 'Owner wallet connected');
  await page.locator('input[name=signer]').fill('not-an-address');
  await click(page, 'Review signer change →');
  await visible(page, 'Enter a valid, nonzero Ethereum address.');
  assert.equal(await page.locator('input[name=signer]').getAttribute('aria-invalid'), 'true');
  await page.locator('input[name=signer]').fill(OWNER);
  await page.locator('input[name=quorum]').fill('51');
  await click(page, 'Review panel settings →');
  await visible(page, 'Use a panel of 2–300');
  assert.equal(await page.locator('input[name=quorum]').getAttribute('aria-invalid'), 'true');
  await page.locator('input[name=panel]').fill('60');
  await page.locator('input[name=quorum]').fill('45');
  await click(page, 'Review panel settings →');
  await page.getByRole('dialog').getByRole('button', { name: 'Apply settings' }).click();
  await visible(page, 'Contract update confirmed');
  assert.deepEqual(state.calls.at(-1).args, [60, 45, 86400]);
  await page.locator('input[name=signer]').fill(USER);
  await click(page, 'Review signer change →');
  await page.getByRole('dialog').getByRole('button', { name: 'Apply settings' }).click();
  await visible(page, 'Contract update confirmed');
  assert.equal(state.signer, USER);
  await click(page, 'Review protocol change →');
  await page.getByRole('dialog').getByRole('button', { name: 'Apply settings' }).click();
  await visible(page, 'Contract update confirmed');
  assert.equal(state.calls.at(-1).functionName, 'setProtocol');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(output, 'admin-mocked.png'), fullPage: true });
  await noOverflow(page, 320);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(output, 'admin-mobile-mocked.png'), fullPage: true });
  await noOverflow(page, 1440);
  pass('Non-owner lock, account-change role update, invalid admin fields, all three owner setters, admin mobile reflow');

  await navigate(page, '/');
  await page.locator('#question').fill('Is this a rejected transaction?');
  await page.evaluate(() => { window.__wallet.reject = true; });
  await page.getByRole('button', { name: 'Approve 0.5 IMD' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve fee' }).click();
  await visible(page, 'Request declined in your wallet');
  assert.equal(await page.locator('#question').inputValue(), 'Is this a rejected transaction?');
  pass('Wallet rejection preserves draft and exposes recovery');
  await click(page, 'Dismiss');

  // A changed price must never silently raise an approval.
  await page.getByRole('button', { name: 'Approve 0.5 IMD' }).click();
  state.price = parseEther('0.75');
  const before = state.calls.length;
  await page.getByRole('dialog').getByRole('button', { name: 'Approve fee' }).click();
  await visible(page, 'The fee or protocol settings changed');
  assert.equal(state.calls.length, before);
  pass('Price change between review and signing blocks submission');
  state.price = parseEther('0.5');
  state.allowance = parseEther('0.1');
  await page.reload();
  await connect(page); await click(page, 'Switch network');
  await page.locator('#question').fill('Does the approval reset first?');
  await page.getByRole('button', { name: 'Reset previous approval' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset approval' }).click();
  await visible(page, 'Approval reset confirmed');
  assert.equal(state.calls.at(-1).args[1], 0n);
  pass('Nonzero insufficient allowance is reset before a new exact approval');

  state.receiptStatus = '0x0';
  await page.getByRole('button', { name: 'Approve 0.5 IMD' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve fee' }).click();
  await visible(page, 'The transaction reverted');
  assert.equal(state.allowance, 0n);
  pass('Reverted receipt is never reported as approval success');
  state.receiptStatus = '0x1';
  await click(page, 'Dismiss');

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  assert.deepEqual(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.length })), []);
  const contrasts = await page.evaluate(() => {
    const luminance = color => { const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
    const measure = (selector, background) => { const fg = getComputedStyle(document.querySelector(selector)).color; const bg = getComputedStyle(document.querySelector(background)).backgroundColor; const a = luminance(fg), b = luminance(bg); return { foreground: fg, background: bg, ratio: +((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2) }; };
    return { body: measure('h1', 'html'), muted: measure('.hero-description', 'html'), hint: measure('.fee-note', '.ask-panel'), primary: measure('.primary', '.primary') };
  });
  for (const value of Object.values(contrasts)) assert.ok(value.ratio >= 4.5);
  await page.locator('#question').focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(output, 'focus-mocked.png'), fullPage: true });
  for (const width of [320, 390, 768, 1024, 1440]) await noOverflow(page, width);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.primary').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  pass('Axe WCAG A/AA scan, computed text contrast, 320/390/768/1024/1440px overflow, 200% text, reduced motion');

  await navigate(page, '/answers');
  const archiveAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  assert.deepEqual(archiveAxe.violations.map(v => v.id), []);
  state.failed = true;
  await click(page, 'Refresh ↻');
  await visible(page, 'Chain data is unavailable');
  state.failed = false;
  await click(page, 'Retry');
  await page.getByText('Chain data is unavailable', { exact: false }).waitFor({ state: 'hidden' });
  pass('RPC failure reports stale data and retry restores the archive');
  assert.deepEqual(browserErrors, []); assert.deepEqual(resourcesFailed, []);
  pass('No uncaught page errors or failed local production assets');
  report = { completed: new Date().toISOString(), result: 'PASS', checks, axeViolations: { ask: axe.violations.length, archive: archiveAxe.violations.length }, contrasts, browserErrors, resourcesFailed, limitations: ['Wallet and transaction tests use mocked RPC responses; no live transaction was sent.', 'No real wallet extension, screen reader, native zoom, physical mobile device, or oracle delivery was tested.', 'The live fee check expects the observed 0.5 IMD and should be updated if the protocol price changes.'] };
  await context.close();
} catch (e) {
  report = { completed: new Date().toISOString(), result: 'FAIL', checks, error: e.stack, browserErrors, resourcesFailed };
  throw e;
} finally {
  await writeFile(join(output, 'interaction-results.json'), JSON.stringify(report, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n');
  await browser.close();
  await new Promise(done => server.close(done));
}

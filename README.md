# ask-oncahin

A minimal, dark, ASCII-inspired interface for the IdentityMD AskOracle on **Robinhood Chain mainnet (4663)**. The requested spelling, `ask-oncahin`, is used throughout.

The ready-to-publish site is in **[dist/](dist/index.html)**. It includes its JavaScript, CSS, two local WOFF2 fonts, favicon, and dependency notices. Source, the npm lockfile, and reproducible browser checks are included. No backend, credentials, remote fonts, or wallet service account is required.

## Install, develop, preview, rebuild

Use **Node.js 24+** and npm. From the repository root:

```sh
npm ci
npm run dev
```

To check and rebuild the static export:

```sh
npm run typecheck
npm run build
npm run preview
```

The preview normally opens at `http://localhost:4173`. Serve the export over HTTP(S); opening the HTML through `file://` does not support JavaScript modules correctly.

## Publish

Upload **the contents of `dist/`**, including `assets/` and the license text files, to any static host or IPFS directory. For an ENS website, point its content hash at that directory. Use HTTPS or a secure gateway for wallet connections. Vite uses `base: './'`, and navigation uses hashes, so gateway subpaths work without server rewrites. Publish the generated export after rebuilding; the publisher does not need to run npm.

Keep `src/`, `public/`, `tests/`, `artifacts/`, the root HTML/configuration, documentation, `package.json`, `package-lock.json`, and `dist/` in the submission. Exclude `node_modules` and dependency/cache directories at every depth, browser binaries, logs, `.imd` inputs, and `test/scratch`. No ignore file was changed. Dependencies and browser downloads used for this assignment were installed only in `/tmp`, outside the repository.

## Implemented interactions

- Discover EIP-6963 browser wallets, with a legacy `window.ethereum` fallback; connect, disconnect locally, and respond to account/network changes. Add or switch to Robinhood Chain when necessary. Mobile users can use their wallet’s built-in browser.
- Read the live token, decimals, balance, allowance, protocol configuration, and fee. Approve **exactly one current question fee** to AskOracle. A nonzero allowance that differs from the price is reset to zero first. Unlimited approval is never requested.
- Review and submit `ask(string)`. Validate the contract’s 500-byte UTF-8 limit, reject control characters/newlines, simulate the action, request wallet confirmation, and wait for a successful receipt. The fee and addresses are rechecked before signing. Errors preserve the draft.
- Browse all questions in pages of ten, filter/search the current page, find any positive question ID, and read yes/no results and panel agreement. Refreshes run every 30 seconds. Pending and unanswered results are distinct from a “No” answer.
- Mark an expired pending question unanswered through the permissionless `markUnanswered` function. This does not refund its fee.
- At `#/admin`, the contract owner can review and execute `setPanel`, `setSigner`, and `setProtocol`. The UI reads `owner()`; the contract enforces authorization. No ownership-transfer function exists in this ABI.

Questions and wallet addresses are public. Asking spends the fee immediately, and unanswered questions are not refunded. ETH is required for gas. Answers are delivered by the existing oracle/intake infrastructure; this static site does not run an oracle or produce attestations. `onOracleResult` is an intake-only callback, so it is intentionally not presented as an admin transaction.

## Contract and network configuration

The [verified contract](https://robin.etherscan.io/address/0x7c2a56beeca74a75b01054702d1195bfa72124f0#code) and its ABI were retrieved on 2026-10-08. The ABI is retained in [src/contracts/askOracleAbi.ts](src/contracts/askOracleAbi.ts). [src/chain.ts](src/chain.ts) owns the contract address, chain definition, and RPC. Network values were checked against the [official Robinhood Chain documentation](https://docs.robinhood.com/chain/connecting/) and a live `eth_chainId` request.

| Setting | Value |
| --- | --- |
| Chain | Robinhood Chain mainnet, `4663` / `0x1237` |
| AskOracle | `0x7c2a56beeca74a75b01054702d1195bfa72124f0` |
| Public RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Gas currency | ETH |
| Observed IMD token | `0x5F7Bb59365ce557C26dbcAa4EE9d39A4b95B7127` |
| Observed intake | `0x1397434cd35e8a9C8aC312A61D3A285EB31dea56` |
| Observed question fee | 0.5 IMD, with 18 decimals |
| Observed question count | 0 |
| Observed panel / quorum / validity | 50 / 40 / 86,400 seconds |

“Observed” values are a point-in-time check, not frontend defaults. The site discovers these values from the contract. The public RPC is rate-limited; a production operator can replace `RPC` in `src/chain.ts` with a browser-accessible endpoint and rebuild. Any value in a static build is public: never put a private credential in the bundle. Reads and wallet operations require a working network connection. The deployed contract can change price/settings between simulation and inclusion; exact allowance caps the approved token spend, but cannot freeze owner-controlled configuration.

## Validation

```sh
npx playwright install chromium
npm run validate
```

`tests/validate.mjs` starts and stops a local server within one foreground process, serves the actual `dist/` at `/preview/`, and closes Chromium when finished. It first checks live **read-only** contract data, then intercepts RPC calls and injects a mock wallet for transactions. No real approval or transaction is sent. The live check currently expects the observed 0.5 IMD; update that assertion if the protocol price changes. Mock fixtures are only in the test and are never shipped into the application.

Actual results on 2026-10-08:

- `npm run typecheck`: passed.
- `npm run build`: passed. Vite reports a non-fatal >500 kB main-chunk advisory (about 553 kB, 166 kB gzip).
- `npm run validate`: passed 18 grouped interaction checks, including approval/ask/admin calldata, rejection and reverted receipts, fee-change protection, archive pagination/filtering, invalid forms, and RPC recovery.
- Chromium: 320, 390, 768, 1024, and 1440 CSS-pixel reflow checks; rendered screenshots inspected at desktop/mobile widths; 200% text enlargement passed. No failed local assets or uncaught page exceptions in the instrumented mocked run.
- Axe scans: zero violations in the ask and archive states for the selected WCAG A/AA rules. Four computed text contrast pairs passed 4.5:1.

The supplied browser connector could not start because its Chrome binary was absent. A local Playwright Chromium install was used instead. The assignment’s protected repository paths were not used for dependency installation: identical source/configuration were copied into `/tmp/ask-oncahin-build`, npm scripts ran there, and the tested export and evidence were copied back. This is a worker report, not an independent behavior certification.

See [artifacts/validation.md](artifacts/validation.md) for the six-domain Better Interface review, fixes, and limitations; [artifacts/interaction-results.json](artifacts/interaction-results.json) for test results; and [DESIGN.md](DESIGN.md) for the implemented design system.

Not tested: a real wallet extension, live paid transaction, actual oracle delivery, transaction replacement/timeout in a real mempool, screen reader, browser-native zoom, or physical mobile device. WalletConnect/QR pairing is not included; injected browser wallets are supported. Search and “My questions” apply to the current page, not an indexed global dataset. The current live deployment has no questions, so populated-state screenshots are explicitly marked `mocked`.

## Attribution

Design review applied the provided Better Interface guide by Jakub Krehel (MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`). Documentation method follows the provided Impeccable reference by Paul Bakaus (Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). The included guidance licenses are retained in [artifacts/design-guide-LICENSE.txt](artifacts/design-guide-LICENSE.txt). IBM Plex Mono is © IBM Corp., SIL OFL 1.1; its license and bundled dependency notices are in `public/` and the static export.

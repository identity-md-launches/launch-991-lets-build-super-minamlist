import { createPublicClient, defineChain, erc20Abi, http, parseAbi, type Address, type Hex } from 'viem';
import { askOracleAbi } from './contracts/askOracleAbi';

export const CONTRACT: Address = '0x7c2a56beeca74a75b01054702d1195bfa72124f0';
export const EXPLORER = 'https://robin.etherscan.io';
export const RPC = 'https://rpc.mainnet.chain.robinhood.com';
export const chain = defineChain({
  id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } }, blockExplorers: { default: { name: 'Etherscan', url: EXPLORER } },
});
export const client = createPublicClient({ chain, transport: http(RPC, { batch: true, retryCount: 1, timeout: 12_000 }) });
export const intakeAbi = parseAbi(['function priceOf(bytes32 action, address asset) view returns (uint256)']);
export { askOracleAbi, erc20Abi };

export async function readConfig() {
  if (await client.getChainId() !== chain.id) throw new Error('The RPC returned a different network. Refresh before continuing.');
  const [owner, imd, intake, action, signer, panel, quorum, validity, count, latest, timeout] = await Promise.all([
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'owner' }),
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'imd' }),
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'intake' }),
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'action' }),
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'oracleSigner' }),
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'panelSize' }),
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'quorum' }),
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'validForSeconds' }),
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'count' }),
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'latestAnswered' }),
    client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'ANSWER_TIMEOUT' }),
  ]);
  // Price failures do not block the public archive or owner configuration.
  const payment = await Promise.allSettled([
    client.readContract({ address: intake, abi: intakeAbi, functionName: 'priceOf', args: [action, imd] }),
    client.readContract({ address: imd, abi: erc20Abi, functionName: 'decimals' }),
    client.readContract({ address: imd, abi: erc20Abi, functionName: 'symbol' }),
  ]);
  const price = payment[0].status === 'fulfilled' ? payment[0].value : null;
  const decimals = payment[1].status === 'fulfilled' ? payment[1].value : null;
  const symbol = payment[2].status === 'fulfilled' ? payment[2].value : 'IMD';
  return { owner, imd, intake, action, signer, panel, quorum, validity, count, latest, timeout, price, decimals, symbol };
}
export type Config = Awaited<ReturnType<typeof readConfig>>;
export type Question = { id: bigint; asker: Address; text: string; status: number; answer: boolean; agreed: number; quorum: number; panel: number; askedAt: bigint; answeredAt: bigint };
export async function readQuestion(id: bigint): Promise<Question> {
  const [asker, text, status, answer, agreed, quorum, panel, askedAt, answeredAt] = await client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'question', args: [id] });
  return { id, asker, text, status, answer, agreed, quorum, panel, askedAt, answeredAt };
}
export async function readQuestions(count: bigint, page = 0) {
  const top = count - BigInt(page * 10);
  const ids = Array.from({ length: top > 10n ? 10 : top > 0n ? Number(top) : 0 }, (_, i) => top - BigInt(i));
  return Promise.all(ids.map(readQuestion));
}
export async function readFunds(account: Address, config: Config) {
  const [balance, allowance] = await Promise.all([
    client.readContract({ address: config.imd, abi: erc20Abi, functionName: 'balanceOf', args: [account] }),
    client.readContract({ address: config.imd, abi: erc20Abi, functionName: 'allowance', args: [account, CONTRACT] }),
  ]);
  return { balance, allowance };
}
export function questionError(text: string): string {
  if (!text.trim()) return 'Write a yes/no question before continuing.';
  if (new TextEncoder().encode(text).length > 500) return 'Keep your question within 500 UTF-8 bytes. Some characters use more than one byte.';
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 32 || (code >= 127 && code <= 159) || (code >= 0xd800 && code <= 0xdfff)) return 'Use a single line without tabs, line breaks, or control characters.';
  }
  return '';
}
export const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
export const statusText = (q: Question) => q.status === 0 ? 'Pending' : q.status === 2 ? 'Unanswered' : q.answer ? 'Yes' : 'No';
export function errorText(error: unknown) {
  const e = error as { shortMessage?: string; message?: string; code?: number };
  const message = e.shortMessage || e.message || 'Unknown error';
  if (e.code === 4001 || /rejected|denied/i.test(message)) return 'Request declined in your wallet. Nothing further was submitted. You can try again.';
  if (/timeout|timed out|fetch|HTTP|network/i.test(message)) return 'Unable to reach Robinhood Chain. Check your connection and try again. If a transaction was sent, check its explorer link before retrying.';
  return message.length > 300 ? `${message.slice(0, 300)}…` : message;
}
export type AdminCall = { functionName: 'setPanel'; args: readonly [number, number, number] } | { functionName: 'setSigner'; args: readonly [Address] } | { functionName: 'setProtocol'; args: readonly [Address, Address, Hex] };

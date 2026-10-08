import { useCallback, useEffect, useState } from 'react';
import { createWalletClient, custom, type Address, type EIP1193Provider } from 'viem';
import { chain, RPC, EXPLORER } from './chain';

type Provider = EIP1193Provider & { on?: (event: string, callback: (...args: unknown[]) => void) => void; removeListener?: (event: string, callback: (...args: unknown[]) => void) => void };
export type WalletOption = { info: { uuid: string; name: string }; provider: Provider };
declare global { interface Window { ethereum?: Provider } }

export function useWallet() {
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [provider, setProvider] = useState<Provider>();
  const [account, setAccount] = useState<Address>();
  const [network, setNetwork] = useState<number>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<WalletOption>).detail;
      if (!detail?.provider || !detail.info?.uuid) return;
      setOptions(old => old.some(o => o.provider === detail.provider) ? old : [...old.filter(o => o.info.uuid !== 'injected'), detail]);
    };
    window.addEventListener('eip6963:announceProvider', receive);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    if (window.ethereum) setOptions(old => old.length ? old : [{ info: { uuid: 'injected', name: 'Browser wallet' }, provider: window.ethereum! }]);
    return () => window.removeEventListener('eip6963:announceProvider', receive);
  }, []);
  useEffect(() => {
    if (!provider) return;
    const accounts = (value: unknown) => setAccount((value as Address[])[0]);
    const changed = (value: unknown) => setNetwork(Number(value));
    const disconnect = () => { setAccount(undefined); setNetwork(undefined); };
    provider.on?.('accountsChanged', accounts);
    provider.on?.('chainChanged', changed);
    provider.on?.('disconnect', disconnect);
    return () => { provider.removeListener?.('accountsChanged', accounts); provider.removeListener?.('chainChanged', changed); provider.removeListener?.('disconnect', disconnect); };
  }, [provider]);
  const connect = useCallback(async (option: WalletOption) => {
    setBusy(true);
    try {
      const accounts = await option.provider.request({ method: 'eth_requestAccounts' });
      const id = await option.provider.request({ method: 'eth_chainId' });
      setProvider(option.provider); setAccount(accounts[0]); setNetwork(Number(id));
      if (!accounts[0]) throw new Error('No account was shared. Unlock your wallet and try again.');
    } finally { setBusy(false); }
  }, []);
  const switchChain = async () => {
    if (!provider) throw new Error('Connect your wallet first.');
    setBusy(true);
    try {
      try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1237' }] }); }
      catch (e) {
        if ((e as { code?: number }).code !== 4902) throw e;
        await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x1237', chainName: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrls: [RPC], blockExplorerUrls: [EXPLORER] }] });
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1237' }] });
      }
      setNetwork(Number(await provider.request({ method: 'eth_chainId' })));
    } finally { setBusy(false); }
  };
  const checkedClient = async () => {
    if (!provider || !account) throw new Error('Connect your wallet first.');
    const [accounts, id] = await Promise.all([provider.request({ method: 'eth_accounts' }), provider.request({ method: 'eth_chainId' })]);
    if (Number(id) !== chain.id) throw new Error('Switch your wallet to Robinhood Chain before continuing.');
    if (accounts[0]?.toLowerCase() !== account.toLowerCase()) throw new Error('Your wallet account changed. Review the action again.');
    return createWalletClient({ account, chain, transport: custom(provider) });
  };
  return { options, account, network, busy, connect, switchChain, checkedClient, disconnect: () => { setAccount(undefined); setProvider(undefined); setNetwork(undefined); } };
}

import { useState, type FormEvent } from 'react';
import { isAddress, isHex, zeroAddress, type Address, type Hex } from 'viem';
import { type AdminCall, type Config } from './chain';
import { AddressLink } from './components';

export default function Admin({ config, account, disabled, connect, review }: { config?: Config; account?: Address; disabled: boolean; connect: () => void; review: (call: AdminCall) => void }) {
  const [error, setError] = useState('');
  const isOwner = account && config?.owner.toLowerCase() === account.toLowerCase();
  function submit(event: FormEvent<HTMLFormElement>, kind: AdminCall['functionName']) {
    event.preventDefault(); setError('');
    const form = event.currentTarget;
    const fail = (name: string, message: string) => {
      setError(message);
      const field = form.elements.namedItem(name) as HTMLInputElement;
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', 'admin-error');
      field.focus();
    };
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) || '').trim();
    if (kind === 'setPanel') {
      const panel = Number(value('panel')), quorum = Number(value('quorum')), validity = Number(value('validity'));
      if (![panel, quorum, validity].every(Number.isInteger) || panel < 2 || panel > 300 || quorum < 2 || quorum > panel || validity < 60 || validity > 2592000) { fail('quorum', 'Use a panel of 2–300, a quorum of 2 up to the panel size, and validity of 60–2,592,000 seconds.'); return; }
      review({ functionName: 'setPanel', args: [panel, quorum, validity] });
    } else {
      const address = value(kind === 'setSigner' ? 'signer' : 'intake');
      if (!isAddress(address) || address.toLowerCase() === zeroAddress) { fail(kind === 'setSigner' ? 'signer' : 'intake', 'Enter a valid, nonzero Ethereum address.'); return; }
      if (kind === 'setSigner') review({ functionName: 'setSigner', args: [address] });
      else {
        const imd = value('imd'), action = value('action');
        if (!isAddress(imd) || imd.toLowerCase() === zeroAddress || !isHex(action) || action.length !== 66 || /^0x0+$/.test(action)) { fail(!isAddress(imd) || imd.toLowerCase() === zeroAddress ? 'imd' : 'action', 'Enter a nonzero token address and a nonzero action ID of exactly 32 bytes (0x + 64 hex characters).'); return; }
        review({ functionName: 'setProtocol', args: [address, imd, action as Hex] });
      }
    }
  }
  return <>
    <div className="page-heading"><p className="eyebrow">[ owner console ]</p><h1>Contract controls<span className="accent">.</span></h1><p>Manage the settings used for new questions.</p></div>
    {!isOwner ? <section className="locked-panel"><span className="terminal-symbol" aria-hidden="true">[ / ]</span><h2>{account ? 'Owner access required' : 'Connect the owner wallet'}</h2><p>{account ? 'This wallet does not match the contract owner.' : 'The contract checks your wallet address for every admin transaction.'}</p>{config && <p>Owner: <AddressLink address={config.owner} /></p>}{!account && <button className="primary" onClick={connect}>Connect wallet <span aria-hidden="true">↗</span></button>}</section> : <div className="admin-grid" key={config?.owner} onInput={e => { if (e.target instanceof HTMLInputElement) { e.target.removeAttribute('aria-invalid'); e.target.removeAttribute('aria-describedby'); } setError(''); }}>
      <div className="owner-strip">[✓] Owner wallet connected <AddressLink address={account!} /></div>
      <p id="admin-error" className="form-error" role="alert">{error}</p>
      <form className="admin-card" onSubmit={e => submit(e, 'setPanel')}><p className="eyebrow">01 / consensus</p><h2>Oracle panel</h2><p>Set the panel size, minimum agreement, and attestation validity.</p><div className="form-grid">
        <label>Panel size<input name="panel" type="number" min="2" max="300" required defaultValue={config?.panel} /></label>
        <label>Quorum<input name="quorum" type="number" min="2" max="300" required defaultValue={config?.quorum} /></label>
        <label>Validity (seconds)<input name="validity" type="number" min="60" max="2592000" required defaultValue={config?.validity} /></label>
      </div><button className="secondary" disabled={disabled}>Review panel settings →</button></form>
      <form className="admin-card" onSubmit={e => submit(e, 'setSigner')}><p className="eyebrow">02 / verification</p><h2>Oracle signer</h2><p>Replace the address trusted to sign oracle answers.</p><label>Signer address<input name="signer" required spellCheck={false} defaultValue={config?.signer} placeholder="0x…" /></label><button className="secondary" disabled={disabled}>Review signer change →</button></form>
      <form className="admin-card" onSubmit={e => submit(e, 'setProtocol')}><p className="eyebrow">03 / protocol</p><h2>Payment & intake</h2><p>Changes where requests are sent and which token pays for them. Existing requests keep their original intake.</p>
        <label>Intake contract<input name="intake" required spellCheck={false} defaultValue={config?.intake} placeholder="0x…" /></label>
        <label>IMD token contract<input name="imd" required spellCheck={false} defaultValue={config?.imd} placeholder="0x…" /></label>
        <label>Action ID (bytes32)<input name="action" required spellCheck={false} defaultValue={config?.action} placeholder="0x…" /></label><button className="secondary" disabled={disabled}>Review protocol change →</button>
      </form>
    </div>}
  </>;
}

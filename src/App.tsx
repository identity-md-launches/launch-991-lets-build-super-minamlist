import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { formatUnits, type Abi, type Address, type Hash } from 'viem';
import { askOracleAbi, chain, client, CONTRACT, erc20Abi, errorText, EXPLORER, questionError, readConfig, readFunds, readQuestion, readQuestions, short, statusText, type AdminCall, type Config, type Question } from './chain';
import { useWallet } from './wallet';
import { AddressLink, External, Modal, QuestionRows, Steps } from './components';
import Admin from './Admin';

type PaymentReview = { config: Config; text: string; reset?: boolean };
type Review = ({ kind: 'approve' } & PaymentReview) | ({ kind: 'ask' } & PaymentReview) | { kind: 'admin'; call: AdminCall } | { kind: 'expire'; question: Question };
const examples = ['Has Robinhood Chain produced a block in the last hour?', 'Is the IMD token deployed on Robinhood Chain?'];

function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const change = () => { setRoute(location.hash.slice(1) || '/'); window.scrollTo(0, 0); requestAnimationFrame(() => document.getElementById('main')?.focus()); };
    window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change);
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  const wallet = useWallet();
  const [config, setConfig] = useState<Config>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [hash, setHash] = useState<Hash>();
  const [txBusy, setTxBusy] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [review, setReview] = useState<Review>();
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [funds, setFunds] = useState<{ balance: bigint; allowance: bigint; account: Address; token: Address }>();
  const [fundsError, setFundsError] = useState('');
  const [fundsTick, setFundsTick] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Question>();
  const [detailError, setDetailError] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const refreshId = useRef(0);
  const locked = useRef(false);
  const isArchive = route === '/answers';
  const isDetail = route.startsWith('/question/');
  const wrongChain = !!wallet.account && wallet.network !== chain.id;
  const currentFunds = funds?.account === wallet.account && funds?.token === config?.imd ? funds : undefined;
  const readyPrice = config?.price != null && config.decimals != null && config.price > 0n;
  const fee = readyPrice ? `${formatUnits(config!.price!, config!.decimals!)} ${config!.symbol}` : 'Unavailable';
  const approved = readyPrice && currentFunds && currentFunds.allowance === config!.price!;

  const refresh = useCallback(async (quiet = false) => {
    const id = ++refreshId.current;
    if (!quiet) setLoading(true);
    try {
      const next = await readConfig();
      const rows = await readQuestions(next.count, isArchive ? page : 0);
      if (id !== refreshId.current) return;
      setConfig(next); setQuestions(rows); setLoadError('');
    } catch (e) { if (id === refreshId.current) setLoadError(errorText(e)); }
    finally { if (id === refreshId.current) setLoading(false); }
  }, [page, isArchive]);
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => { if (!document.hidden && !locked.current) void refresh(true); }, 30_000);
    return () => { clearInterval(interval); refreshId.current++; };
  }, [refresh]);
  useEffect(() => {
    let active = true;
    if (!wallet.account || !config || wrongChain) { setFunds(undefined); return; }
    setFundsError('');
    void readFunds(wallet.account, config).then(value => { if (active) setFunds({ ...value, account: wallet.account!, token: config.imd }); }).catch(e => { if (active) { setFunds(undefined); setFundsError(errorText(e)); } });
    return () => { active = false; };
  }, [wallet.account, config, wrongChain, fundsTick]);
  useEffect(() => {
    setReview(undefined); setFunds(undefined);
  }, [wallet.account, wallet.network]);
  useEffect(() => {
    if (!isDetail) return;
    let active = true; setSelected(undefined); setDetailError('');
    const id = route.split('/')[2];
    if (!/^[1-9]\d{0,76}$/.test(id)) { setDetailError('Enter a positive question ID.'); return; }
    const read = () => void readQuestion(BigInt(id)).then(q => { if (active) { setSelected(q); setDetailError(''); } }).catch(e => { if (active) setDetailError(errorText(e)); });
    read(); const timer = setInterval(read, 30_000);
    return () => { active = false; clearInterval(timer); };
  }, [route, isDetail, fundsTick]);
  useEffect(() => { document.title = `${route === '/admin' ? 'Admin' : isArchive ? 'Browse answers' : isDetail ? 'Question' : 'Ask a question'} — ask-oncahin`; }, [route, isArchive, isDetail]);

  async function switchNetwork() { setError(''); try { await wallet.switchChain(); } catch (e) { setError(errorText(e)); } }
  function begin(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!wallet.account) { setWalletOpen(true); return; }
    if (wrongChain) { void switchNetwork(); return; }
    const problem = questionError(text); setFieldError(problem);
    if (problem) { textRef.current?.focus(); return; }
    if (!config || !readyPrice || loadError) { setError('A current question fee is required. Refresh the chain data and try again.'); return; }
    if (!currentFunds) { setError('Your token balance is unavailable. Retry the balance check.'); return; }
    if (currentFunds.balance < config.price!) { setError(`You need ${fee} to ask. Your wallet holds ${formatUnits(currentFunds.balance, config.decimals!)} ${config.symbol}.`); return; }
    setReview({ kind: approved ? 'ask' : 'approve', config, text, reset: !approved && currentFunds.allowance > 0n });
  }
  async function execute() {
    if (!review || locked.current) return;
    locked.current = true; setTxBusy(true); setError(''); setHash(undefined); setStatus('Checking the latest contract state…');
    const action = review;
    try {
      const wc = await wallet.checkedClient();
      const account = wc.account.address;
      let tx: Hash;
      if (action.kind === 'approve' || action.kind === 'ask') {
        const fresh = await readConfig();
        const old = action.config;
        if (fresh.imd !== old.imd || fresh.intake !== old.intake || fresh.action !== old.action || fresh.price !== old.price || fresh.panel !== old.panel || fresh.quorum !== old.quorum || fresh.validity !== old.validity) {
          setConfig(fresh); throw new Error('The fee or protocol settings changed. Review the updated details before continuing.');
        }
        const liveFunds = await readFunds(account, fresh);
        if (action.kind === 'approve') {
          const amount = action.reset ? 0n : fresh.price!;
          const simulated = await client.simulateContract({ address: fresh.imd, abi: erc20Abi, functionName: 'approve', args: [CONTRACT, amount], account });
          if (!simulated.result) throw new Error('The token refused the approval. Check the token contract before retrying.');
          await wallet.checkedClient(); setStatus('Confirm the approval in your wallet…');
          tx = await wc.writeContract(simulated.request);
        } else {
          const problem = questionError(action.text); if (problem) throw new Error(problem);
          if (liveFunds.allowance !== fresh.price! || liveFunds.balance < fresh.price!) throw new Error('Your IMD balance or approval changed. Refresh and approve the current fee before asking.');
          const { request } = await client.simulateContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'ask', args: [action.text], account });
          await wallet.checkedClient(); setStatus('Confirm your question in your wallet…');
          tx = await wc.writeContract(request);
        }
      } else if (action.kind === 'admin') {
        const owner = await client.readContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'owner' });
        if (owner.toLowerCase() !== account.toLowerCase()) throw new Error('Only the contract owner can change these settings.');
        const { request } = await client.simulateContract({ address: CONTRACT, abi: askOracleAbi as Abi, ...action.call, account });
        await wallet.checkedClient(); setStatus('Confirm the settings change in your wallet…');
        tx = await wc.writeContract(request);
      } else {
        const { request } = await client.simulateContract({ address: CONTRACT, abi: askOracleAbi, functionName: 'markUnanswered', args: [action.question.id], account });
        await wallet.checkedClient(); setStatus('Confirm the status change in your wallet…');
        tx = await wc.writeContract(request);
      }
      setHash(tx); setStatus('Transaction sent. Waiting for confirmation…'); setReview(undefined);
      let cancelled = false;
      const receipt = await client.waitForTransactionReceipt({ hash: tx, timeout: 120_000, onReplaced: ({ transaction, reason }) => { setHash(transaction.hash); cancelled = reason !== 'repriced'; } });
      if (cancelled) throw new Error('The transaction was cancelled or replaced with a different action. Check its explorer link and refresh before retrying.');
      if (receipt.status !== 'success') throw new Error('The transaction reverted. No contract change was applied. Check its explorer link for details.');
      setStatus(action.kind === 'approve' ? action.reset ? 'Approval reset confirmed. You can now approve the exact question fee.' : 'Approval confirmed. You can now submit your question.' : action.kind === 'ask' ? 'Question confirmed onchain. Browse questions to follow its answer.' : 'Contract update confirmed.');
      if (action.kind === 'ask') { setText(''); location.hash = '/answers'; setPage(0); }
      setFundsTick(v => v + 1); await refresh(true);
    } catch (e) { setError(errorText(e)); setStatus(''); setReview(undefined); }
    finally { locked.current = false; setTxBusy(false); }
  }

  const shown = questions.filter(q => (filter === 'all' || (filter === 'mine' ? q.asker.toLowerCase() === wallet.account?.toLowerCase() : filter === 'answered' ? q.status === 1 : filter === 'pending' ? q.status === 0 : q.status === 2)) && q.text.toLowerCase().includes(query.toLowerCase()));
  const adminReview = (call: AdminCall) => { if (wrongChain) { void switchNetwork(); return; } setReview({ kind: 'admin', call }); };
  const primaryLabel = !wallet.account ? 'Connect wallet to ask' : wrongChain ? 'Switch to Robinhood Chain' : !readyPrice ? 'Question fee unavailable' : !currentFunds ? 'Checking token balance…' : approved ? 'Submit question' : currentFunds.allowance > 0n ? 'Reset previous approval' : `Approve ${fee}`;

  return <>
    <a className="skip" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="#/"><span className="brand-mark" aria-hidden="true">[?]</span>ask-oncahin<span className="brand-dot" aria-hidden="true">_</span></a>
      <nav aria-label="Main navigation"><a href="#/" aria-current={route === '/' ? 'page' : undefined}>Ask</a><a href="#/answers" aria-current={isArchive || isDetail ? 'page' : undefined}>Browse answers</a><a href="#/about" aria-current={route === '/about' ? 'page' : undefined}>How it works</a></nav>
      {wallet.account ? <details className="wallet-menu"><summary>{short(wallet.account)} <span aria-hidden="true">⌄</span></summary><div><span className="wallet-address">{wallet.account}</span><button className="secondary" onClick={wallet.disconnect}>Disconnect</button></div></details> : <button className="wallet-button" onClick={() => setWalletOpen(true)}>Connect wallet <span aria-hidden="true">↗</span></button>}
    </div></header>

    <main id="main" tabIndex={-1} className="container">
      <div className="network-bar"><span><span className={`network-dot ${loadError ? 'offline' : ''}`} aria-hidden="true" />Robinhood Chain <span className="network-tag">mainnet</span></span><span className="network-right">{loading ? 'Reading chain…' : loadError ? 'Connection interrupted' : `Chain ID ${chain.id}`}<span aria-hidden="true"> / </span><External href={`${EXPLORER}/address/${CONTRACT}#code`}>Verified contract</External></span></div>
      <div role="status" className={status ? 'notice' : 'sr-only'}>{status}{status && hash && <> <External href={`${EXPLORER}/tx/${hash}`}>View transaction</External></>}</div>
      {error && <div className="notice error" role="alert"><div>{error}{hash && <> <External href={`${EXPLORER}/tx/${hash}`}>View transaction</External></>}</div><button className="text-button" onClick={() => setError('')}>Dismiss</button></div>}
      {loadError && <div className="notice error" role="alert"><div><strong>Chain data is unavailable.</strong> {config && 'Previously loaded data may be out of date. '}{loadError}</div><button className="secondary" disabled={loading} onClick={() => void refresh()}>Retry</button></div>}
      {wrongChain && <div className="notice"><span>Your wallet is on another network. Use Robinhood Chain to send transactions.</span><button className="secondary" disabled={wallet.busy || txBusy} onClick={() => void switchNetwork()}>Switch network</button></div>}

      {route === '/' ? <>
        <section className="hero"><div><p className="eyebrow">[ curiosity, recorded forever ]</p><h1>Ask a question.<br />Leave it onchain<span className="accent">.</span></h1><p className="hero-description">A simple question. A yes or no.<br />An answer anyone can verify.</p></div>
          <div className="ascii-art" aria-hidden="true"><pre>{`           . - - - - .
       . '             ' .
     /      .-------.      \\
    ;       |  ???  |       ;
    |       '---.  |       |
  --+--        /  /      --+--
    |         |__|        |
    ;          __         ;
     \\        |__|       /
       ' .           . '
           ' - - - '
       [ ask. verify. repeat. ]`}</pre></div>
        </section>

        <div className="ask-layout"><section className="ask-panel" aria-labelledby="ask-title"><div className="terminal-bar"><h2 id="ask-title"><span aria-hidden="true">&gt; </span>ask<span className="muted">(question)</span></h2><span>01 / new request</span></div>
          <form onSubmit={begin} noValidate>
            <label className="question-label" htmlFor="question">What do you want to know?</label>
            <div className={`textarea-wrap ${fieldError ? 'invalid' : ''}`}><textarea ref={textRef} id="question" name="question" value={text} onChange={e => { setText(e.target.value); if (fieldError) setFieldError(''); }} placeholder="Ask a clear, verifiable yes/no question…" aria-invalid={!!fieldError} aria-describedby="question-hint question-error" /><div className="textarea-footer"><span aria-hidden="true">↳ answer: yes / no</span><span className={new TextEncoder().encode(text).length > 500 ? 'error-text' : ''}>{new TextEncoder().encode(text).length} / 500 bytes</span></div></div>
            <p id="question-error" className="form-error" role="alert">{fieldError}</p>
            <div className="example-row"><span>Try a question</span><button type="button" className="text-button" onClick={() => { setText(examples[Math.floor(Math.random() * examples.length)]); setFieldError(''); textRef.current?.focus(); }}>Insert an example <span aria-hidden="true">↗</span></button></div>
            <div className="fee-row"><span>Question fee</span><strong>{loading && !config ? 'Reading fee…' : fee}<span className="muted"> + gas</span></strong></div>
            <p id="question-hint" className="fee-note">Questions are public. The fee is spent immediately, even if no answer arrives.</p>
            {wallet.account && readyPrice && <div className="balance-line">{currentFunds ? <>Balance: {formatUnits(currentFunds.balance, config!.decimals!)} {config!.symbol}<span>{approved ? '[✓] Approved' : '[ ] Approval needed'}</span></> : <>{fundsError || 'Reading your token balance…'}{fundsError && <button type="button" className="text-button" onClick={() => setFundsTick(v => v + 1)}>Retry balance</button>}</>}</div>}
            <button className="primary ask-button" disabled={txBusy || wallet.busy || (!!wallet.account && !wrongChain && (!readyPrice || !currentFunds || !!loadError))}>{txBusy ? 'Transaction in progress…' : primaryLabel}<span aria-hidden="true">↗</span></button>
            <ol className="progress-steps" aria-label="Question submission steps"><li className={wallet.account ? 'complete' : 'current'}><span>{wallet.account ? '✓' : '1'}</span>Connect</li><li className={approved ? 'complete' : wallet.account ? 'current' : ''}><span>{approved ? '✓' : '2'}</span>Approve IMD</li><li className={approved ? 'current' : ''}><span>3</span>Ask</li></ol>
          </form>
        </section>
        <aside className="how-panel"><p className="eyebrow">a little context</p><h2>From question<br /> to consensus.</h2><Steps /><div className="protocol-note"><span aria-hidden="true">[i]</span><p>Answers come from an oracle panel. Allow up to {config ? Number(config.timeout) / 3600 : 24} hours for a result.</p></div></aside></div>

        <section className="latest"><div className="section-head"><div><p className="eyebrow">the public record</p><h2>Latest questions <span className="count">{config ? config.count.toString().padStart(2, '0') : '—'}</span></h2></div><a className="text-link" href="#/answers">Browse all <span aria-hidden="true">↗</span></a></div><QuestionRows questions={questions.slice(0, 4)} loading={loading} empty={loadError ? <p>Questions will appear when the connection returns.</p> : undefined} /></section>
      </> : isArchive ? <>
        <div className="page-heading"><p className="eyebrow">[ the public record ]</p><h1>Questions & answers<span className="accent">.</span></h1><p>Every question is public. Every delivered answer stays onchain.</p></div>
        <div className="archive-toolbar"><label className="search-label"><span className="sr-only">Search this page</span><input type="search" placeholder="Search this page…" value={query} onChange={e => setQuery(e.target.value)} /></label><label><span className="sr-only">Filter questions</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All questions</option><option value="answered">Answered</option><option value="pending">Pending</option><option value="unanswered">Unanswered</option><option value="mine" disabled={!wallet.account}>My questions</option></select></label><button className="secondary" disabled={loading} onClick={() => void refresh()}>Refresh ↻</button></div>
        <div className="archive-note"><span>Newest first · filters apply to these 10 entries</span><span>{config?.count.toString() || '—'} total questions</span></div>
        <QuestionRows questions={shown} loading={loading} empty={<><p>{query || filter !== 'all' ? 'No matching questions on this page.' : 'No questions here yet.'}</p><button className="text-button" onClick={() => { setFilter('all'); setQuery(''); }}>Clear filters</button><a className="text-link" href="#/">Ask a question ↗</a></>} />
        <div className="pagination"><button className="secondary" disabled={page === 0 || loading} onClick={() => setPage(v => v - 1)}>← Newer</button><span>Page {page + 1}</span><button className="secondary" disabled={!config || config.count <= BigInt((page + 1) * 10) || loading} onClick={() => setPage(v => v + 1)}>Older →</button></div>
        <form className="lookup" onSubmit={e => { e.preventDefault(); const id = new FormData(e.currentTarget).get('id'); location.hash = `/question/${id}`; }}><label htmlFor="question-id">Have a question ID?</label><input id="question-id" name="id" type="text" inputMode="numeric" pattern="[1-9][0-9]{0,76}" placeholder="e.g. 1" required /><button className="secondary">Find question →</button></form>
      </> : isDetail ? <>
        <a className="back-link" href="#/answers">← All questions</a>
        {detailError ? <section className="empty"><h1>Question unavailable</h1><p role="alert">{detailError}</p><button className="secondary" onClick={() => setFundsTick(v => v + 1)}>Retry question</button></section> : !selected ? <p className="empty" role="status">Reading question…</p> : <article className="detail"><p className="eyebrow">[ question #{selected.id.toString()} ]</p><h1 dir="auto">{selected.text}</h1><div className="detail-answer"><span>Oracle answer</span><strong className={`answer-${selected.status}`}>{statusText(selected)}</strong></div><dl className="detail-data"><div><dt>Asked by</dt><dd><AddressLink address={selected.asker} /></dd></div><div><dt>Submitted</dt><dd>{new Date(Number(selected.askedAt) * 1000).toLocaleString()}</dd></div>{selected.status === 1 && <><div><dt>Panel agreement</dt><dd>{selected.agreed} / {selected.panel} · quorum {selected.quorum}</dd></div><div><dt>Answered</dt><dd>{new Date(Number(selected.answeredAt) * 1000).toLocaleString()}</dd></div></>}</dl>
          {selected.status === 0 && <div className="notice"><p>Waiting for the oracle panel. This page refreshes every 30 seconds. The answer window closes {new Date((Number(selected.askedAt) + Number(config?.timeout ?? 86400n)) * 1000).toLocaleString()}.</p></div>}
          {selected.status === 2 && <p className="notice">No answer was delivered within the answer window. The question fee is not refundable.</p>}
          {selected.status === 0 && Date.now() / 1000 >= Number(selected.askedAt + (config?.timeout ?? 86400n)) && <div className="expired"><p>The answer window has closed. Anyone can mark this question unanswered. This does not refund the fee.</p><button className="secondary" disabled={txBusy} onClick={() => !wallet.account ? setWalletOpen(true) : wrongChain ? void switchNetwork() : setReview({ kind: 'expire', question: selected })}>{!wallet.account ? 'Connect to update status' : 'Mark unanswered'}</button></div>}
          <External href={`${EXPLORER}/address/${CONTRACT}#readContract`}>Read the contract on Etherscan</External>
        </article>}
      </> : route === '/admin' ? <Admin config={config} account={wallet.account} disabled={txBusy || wallet.busy || !!loadError} connect={() => setWalletOpen(true)} review={adminReview} /> : route === '/about' ? <>
        <div className="page-heading"><p className="eyebrow">[ read before you write ]</p><h1>A question, on the record<span className="accent">.</span></h1><p>A small interface to the IdentityMD AskOracle on Robinhood Chain.</p></div>
        <div className="about-grid"><div><Steps /><a className="primary button-link" href="#/">Ask a question ↗</a></div><div className="faq">
          <h2>The useful details</h2><details open><summary>What can I ask?</summary><p>Ask a clear, verifiable yes/no question in one line, up to 500 UTF-8 bytes. Questions target Robinhood Chain with a one-hour evidence window. Avoid private information: your question and wallet address are public.</p></details>
          <details><summary>What am I paying for?</summary><p>The intake contract sets the fee in IMD. Approving allows AskOracle to spend that amount; submitting the question spends it. Both actions also require ETH for gas. Fees are not refundable, including when a question goes unanswered.</p></details>
          <details><summary>How does an answer arrive?</summary><p>The configured oracle service delivers a signed yes/no result through the intake contract. The contract verifies the signature and panel agreement. This site reads that result; it does not generate answers. The answer window is 24 hours.</p></details>
          <details><summary>Which wallet can I use?</summary><p>Use an injected Ethereum-compatible browser wallet or open the site inside your mobile wallet’s browser. Select Robinhood Chain mainnet (4663). WalletConnect and seed phrase entry are not used.</p></details>
          <details><summary>Who can change the settings?</summary><p>The contract’s immutable owner can change the intake, payment token, action, signer, and panel settings from the admin page. Owner permissions are enforced by the contract.</p><a href="#/admin">Open admin console →</a></details>
        </div></div>
      </> : <div className="empty"><h1>Page not found</h1><a href="#/">Return to Ask →</a></div>}
    </main>

    <footer className="site-footer container"><div><a className="footer-brand" href="#/">[?] ask-oncahin</a><span>Small interface. Permanent record.</span></div><div><External href={`${EXPLORER}/address/${CONTRACT}#code`}>{short(CONTRACT)}</External><a href="#/admin" aria-current={route === '/admin' ? 'page' : undefined}>Admin <span aria-hidden="true">↗</span></a><span className="footer-version">v1.0</span></div></footer>

    {walletOpen && <Modal title="Connect a wallet" close={() => setWalletOpen(false)} locked={wallet.busy}><p>Use your wallet on Robinhood Chain. Connecting does not send a transaction.</p>{wallet.options.length ? <div className="wallet-options">{wallet.options.map(option => <button className="secondary" key={option.info.uuid} disabled={wallet.busy} onClick={async () => { setError(''); try { await wallet.connect(option); setWalletOpen(false); } catch (e) { setError(errorText(e)); setWalletOpen(false); } }}>{wallet.busy ? 'Waiting for wallet…' : option.info.name}<span aria-hidden="true">↗</span></button>)}</div> : <div className="notice"><p>No browser wallet detected. Enable your wallet extension and reload, or open this site in your mobile wallet’s browser.</p></div>}<p className="small muted">Your keys stay in your wallet.</p></Modal>}
    {review && <Modal title={review.kind === 'ask' ? 'Review your question' : review.kind === 'approve' ? review.reset ? 'Reset token approval' : 'Approve the question fee' : review.kind === 'admin' ? 'Review contract change' : 'Mark question unanswered'} close={() => setReview(undefined)} locked={txBusy}>
      {review.kind === 'approve' || review.kind === 'ask' ? <>
        {review.kind === 'ask' && <blockquote dir="auto">{review.text}</blockquote>}
        <dl className="review-data"><div><dt>{review.kind === 'approve' ? 'Approval amount' : 'Question fee'}</dt><dd>{review.kind === 'approve' && review.reset ? '0' : formatUnits(review.config.price!, review.config.decimals!)} {review.config.symbol} + ETH gas</dd></div><div><dt>Token</dt><dd className="full-address">{review.config.imd}</dd></div><div><dt>{review.kind === 'approve' ? 'Spender' : 'Contract'}</dt><dd className="full-address">{CONTRACT}</dd></div><div><dt>Network</dt><dd>Robinhood Chain · 4663</dd></div></dl>
        <p>{review.kind === 'approve' ? review.reset ? 'Reset your existing allowance to zero first. Then approve the exact current fee in a separate transaction.' : 'This approves only the current question fee. You will submit and pay for your question in a separate transaction.' : 'Your question will be public and permanent. The fee is spent immediately and is not refunded if no answer arrives.'}</p>
      </> : review.kind === 'admin' ? <><p>This updates the live contract settings. Check every value before confirming in your wallet.</p><p className="eyebrow">{review.call.functionName}</p><ol className="review-args">{review.call.args.map((arg, i) => <li key={i}>{['setPanel', 'setProtocol'].includes(review.call.functionName) ? (review.call.functionName === 'setPanel' ? ['Panel size', 'Quorum', 'Validity (seconds)'] : ['Intake', 'IMD token', 'Action ID'])[i] : 'Signer'}<code>{String(arg)}</code></li>)}</ol></> : <p>Mark question #{review.question.id.toString()} unanswered. This closes the pending status and does not refund the question fee. ETH gas is required.</p>}
      <div className="modal-actions"><button className="secondary" disabled={txBusy} onClick={() => setReview(undefined)}>Cancel</button><button className="primary" disabled={txBusy} onClick={() => void execute()}>{txBusy ? 'Waiting for wallet…' : review.kind === 'ask' ? 'Submit question' : review.kind === 'approve' ? review.reset ? 'Reset approval' : 'Approve fee' : review.kind === 'admin' ? 'Apply settings' : 'Mark unanswered'} ↗</button></div>
    </Modal>}
  </>;
}

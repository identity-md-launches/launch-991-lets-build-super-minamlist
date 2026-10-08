import { useEffect, useRef, type ReactNode } from 'react';
import { EXPLORER, short, statusText, type Question } from './chain';

export function External({ href, children, ...props }: { href: string; children: ReactNode; className?: string; title?: string }) {
  return <a href={href} target="_blank" rel="noreferrer noopener" {...props}>{children}<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a>;
}
export function AddressLink({ address }: { address: string }) {
  return <External href={`${EXPLORER}/address/${address}`} title={address}><bdi>{short(address)}</bdi></External>;
}
export function Modal({ title, children, close, locked = false }: { title: string; children: ReactNode; close: () => void; locked?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(close); closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current!;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={e => { e.preventDefault(); if (!locked) closeRef.current(); }}>
    <div className="section-head"><h2 id="modal-title">{title}</h2><button className="close" aria-label="Close dialog" disabled={locked} onClick={close}>[×]</button></div>
    {children}
  </dialog>;
}
export function QuestionRows({ questions, empty, loading }: { questions: Question[]; empty?: ReactNode; loading?: boolean }) {
  if (loading && !questions.length) return <div className="empty" role="status"><span className="terminal-symbol">[ · · · ]</span><p>Reading questions from the chain…</p></div>;
  if (!questions.length) return <div className="empty"><span className="terminal-symbol" aria-hidden="true">[ ? ]</span>{empty || <><p>No questions yet.</p><span>Your question can be the first entry.</span></>}</div>;
  return <div className="question-list">{questions.map(q => <a className="question-row" href={`#/question/${q.id}`} key={q.id.toString()}>
    <span className="question-id">#{q.id.toString().padStart(3, '0')}</span>
    <div className="question-copy"><span className="question-text" dir="auto">{q.text}</span><span className="question-meta">{short(q.asker)}<span aria-hidden="true"> · </span>{new Date(Number(q.askedAt) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
    <span className={`badge state-${q.status}`}><span aria-hidden="true">{q.status === 0 ? '◷' : q.status === 2 ? '−' : q.answer ? '+' : '−'} </span>{statusText(q)}</span><span className="row-arrow" aria-hidden="true">↗</span>
  </a>)}</div>;
}
export function Steps() {
  return <ol className="how-steps">
    <li><span className="step-no">01</span><div><h3>Connect & approve</h3><p>Connect on Robinhood Chain and approve the question fee in IMD.</p></div></li>
    <li><span className="step-no">02</span><div><h3>Ask a yes/no question</h3><p>Submit your question. An oracle panel works on the answer.</p></div></li>
    <li><span className="step-no">03</span><div><h3>Read it onchain</h3><p>The answer arrives asynchronously. Anyone can read the result.</p></div></li>
  </ol>;
}

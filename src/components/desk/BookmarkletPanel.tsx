import { useEffect, useRef } from 'react';
import { Bookmark } from 'lucide-react';
import { bookmarkletHref } from '../../utils/bookmarklet';

// React blocks javascript: hrefs, so the bookmark link's href is set directly on the DOM node
export default function BookmarkletPanel() {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const appUrl = `${window.location.origin}${window.location.pathname}#/calculator`;
    linkRef.current?.setAttribute('href', bookmarkletHref(appUrl));
  }, []);

  return (
    <details className="panel p-1.5 mb-4 rise rise-1 group">
      <summary className="slab-label flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-1.5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-primary">
          <Bookmark size={11} /> One-click import from eBay &amp; PSA
        </span>
        <span className="font-mono text-[10px] text-text-secondary group-open:hidden">show setup</span>
        <span className="hidden font-mono text-[10px] text-text-secondary group-open:inline">hide</span>
      </summary>
      <div className="grid gap-4 p-3.5 md:grid-cols-[auto_1fr] md:items-start">
        <a
          ref={linkRef}
          onClick={(e) => e.preventDefault()}
          draggable
          title="Drag me to your bookmarks bar"
          className="inline-flex cursor-grab items-center gap-1.5 self-start rounded-md border-2 border-label bg-label-face px-3 py-2 font-display text-base font-bold uppercase text-text-primary active:cursor-grabbing"
        >
          <Bookmark size={14} className="text-label" /> Send to Card Portfolio
        </a>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-text-secondary">
          <li><span className="text-text-primary">Drag the button</span> to your bookmarks bar (show it with ⌘⇧B). One time only.</li>
          <li><span className="text-text-primary">On an eBay listing</span>, click it — the card name, price, grade and cert number land here.</li>
          <li>
            <span className="text-text-primary">On the card’s PSA pop report</span>, drag-select its row (Auth through Total), then click it — the PSA 10 / 9 / total counts
            fill in and set your rates.
          </li>
          <li>Both clicks build up the same card. Check the note that appears, enter the raw price, and the numbers update.</li>
        </ol>
      </div>
      <p className="px-3.5 pb-3 font-mono text-[10px] text-text-secondary">
        Works in desktop Chrome and Safari. It only reads the page you’re looking at when you click it.
      </p>
    </details>
  );
}

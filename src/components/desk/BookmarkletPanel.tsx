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
          <Bookmark size={11} /> One-click import: raw listing → sold comps → pop report
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
          <li><span className="text-text-primary">Drag the button</span> to your bookmarks bar (show it with ⌘⇧B). Replace any older copy.</li>
          <li><span className="text-text-primary">On a raw eBay listing</span> you’re thinking of buying, click it — the card name and raw price land here.</li>
          <li>
            <span className="text-text-primary">Open “PSA sold comps”</span> (under Card &amp; comps) and click it on the results — sold PSA 10s and 9s become
            your PSA 10 / 9 values (median, lots and other graders skipped).
          </li>
          <li>
            <span className="text-text-primary">On the card’s PSA pop report</span>, drag-select its row (Auth through Total) and click it — the counts set your
            10 / 9 rates.
          </li>
        </ol>
      </div>
      <p className="px-3.5 pb-3 font-mono text-[10px] text-text-secondary">
        Works in desktop Chrome and Safari. It only reads the page you’re looking at when you click it.
      </p>
    </details>
  );
}

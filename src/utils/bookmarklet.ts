// The "Send to Card Portfolio" bookmark. `capture` runs on the page the user is
// viewing (an eBay listing, an eBay search, or a pop report), not inside the app,
// so it must be self-contained — it's stringified into a javascript: URL. It only
// gathers raw text and hands it to the app; all interpretation happens in
// importParse so it can improve without the user reinstalling the bookmark.
export const BOOKMARKLET_VERSION = 2;

function capture(appUrl: string, version: number) {
  const clean = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();
  const send = (data: Record<string, unknown>) => {
    window.open(appUrl + '?import=' + encodeURIComponent(JSON.stringify({ v: version, ...data })), 'card-portfolio');
  };

  if (/(^|\.)ebay\./.test(location.hostname)) {
    // Search results (e.g. sold comps): one text blob per listing
    if (/\/sch\//.test(location.pathname)) {
      const seen: Element[] = [];
      const items: string[] = [];
      for (const link of Array.from(document.querySelectorAll('a[href*="/itm/"]'))) {
        const box = link.closest('li') || link.parentElement;
        if (!box || seen.indexOf(box) >= 0) continue;
        seen.push(box);
        const text = clean((box as HTMLElement).innerText);
        if (text) items.push(text.slice(0, 400));
        if (items.length >= 80) break;
      }
      send({ source: 'ebay-search', url: location.href, query: new URLSearchParams(location.search).get('_nkw') || '', items });
      return;
    }

    let price = '';
    for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
      try {
        const parsed = JSON.parse(script.textContent || '');
        for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
          const offers = item && item.offers;
          const offer = Array.isArray(offers) ? offers[0] : offers;
          if (offer && offer.price) { price = String(offer.price); break; }
        }
      } catch { /* not JSON we understand */ }
      if (price) break;
    }
    const priceEl = document.querySelector('[itemprop="price"], .x-price-primary');
    const titleEl = document.querySelector('h1.x-item-title__mainTitle, h1');
    send({
      source: 'ebay',
      url: location.href.split('?')[0],
      title: clean(titleEl ? titleEl.textContent : document.title),
      price: price || clean(priceEl ? priceEl.getAttribute('content') || priceEl.textContent : ''),
      text: clean(document.body.innerText).slice(0, 12000),
    });
    return;
  }

  const selection = clean(String(window.getSelection() || ''));
  if (!selection) {
    alert('Card Portfolio: drag-select the card’s row on the pop report first, then click the button again.');
    return;
  }
  send({ source: 'pop', url: location.href, title: clean(document.title), selection: selection.slice(0, 1500) });
}

export function bookmarkletHref(appUrl: string): string {
  return 'javascript:' + encodeURIComponent(`(${capture.toString()})(${JSON.stringify(appUrl)}, ${BOOKMARKLET_VERSION})`);
}

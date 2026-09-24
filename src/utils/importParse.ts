// Interprets what the "Send to Card Portfolio" bookmark captured. Everything
// here is a best guess from page text, so the calculator shows it for the user
// to confirm rather than trusting it silently.

export interface EbayCapture {
  source: 'ebay';
  url: string;
  title: string;
  price: string;
  text: string;
}

export interface PopCapture {
  source: 'pop';
  url: string;
  title: string;
  selection: string;
}

export type Capture = EbayCapture | PopCapture;

export interface EbayListing {
  url: string;
  title: string;
  price: number;
  grader: string; // '' when the listing looks raw
  grade: string;
  cert: string;
}

export interface PopCounts {
  pop10: number;
  pop9: number;
  total: number;
}

export function decodeCapture(raw: string | null): Capture | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.source === 'ebay' || data?.source === 'pop') return data;
  } catch {
    // not a capture
  }
  return null;
}

function parseMoney(text: string): number {
  const match = text.replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/);
  return match ? Number(match[0]) : 0;
}

const GRADERS = [
  { name: 'PSA', pattern: /\bPSA\b|Professional Sports Authenticator/i },
  { name: 'BGS', pattern: /\bBGS\b|Beckett/i },
  { name: 'CGC', pattern: /\bCGC\b/i },
  { name: 'SGC', pattern: /\bSGC\b/i },
];

export function parseEbay(capture: EbayCapture): EbayListing {
  const { title, text } = capture;
  const cert = (text.match(/Certification\s*(?:Number|No\.?|#)?\s*:?\s*(\d{7,10})\b/i)
    ?? text.match(/\bCert(?:ificate)?\s*(?:#|No\.?|Number)\s*:?\s*(\d{7,10})\b/i))?.[1] ?? '';

  // Item specifics first ("Grade: 10"), then the title ("PSA 10 GEM MINT")
  const grade = (text.match(/\bGrade\b\s*:?\s*(10|[1-9](?:\.5)?)\b/)
    ?? title.match(/\b(?:PSA|BGS|CGC|SGC)\s*(10|[1-9](?:\.5)?)\b/i))?.[1] ?? '';

  const graderLine = text.match(/Professional\s*Grader\s*:?\s*(.{0,60})/i)?.[1] ?? '';
  const grader = grade
    ? GRADERS.find((g) => g.pattern.test(graderLine))?.name ?? GRADERS.find((g) => g.pattern.test(title))?.name ?? ''
    : '';

  return {
    url: capture.url,
    title: title.replace(/\s*\|\s*eBay.*$/i, '').trim(),
    price: parseMoney(capture.price),
    grader,
    grade,
    cert,
  };
}

// PSA's pop report lists a card's counts from Auth up through 10, then Total,
// so the last three whole numbers in a selected row are 9s, 10s and the total.
export function parsePop(capture: PopCapture): PopCounts | null {
  const numbers = (capture.selection.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
    .filter((n) => !n.includes('.'))
    .map((n) => Number(n.replace(/,/g, '')));
  if (numbers.length < 3) return null;
  const [pop9, pop10, total] = numbers.slice(-3);
  if (total <= 0 || total < pop9 + pop10) return null;
  return { pop10, pop9, total };
}

const CATEGORY_PATTERNS: [string, RegExp][] = [
  ['One Piece', /one piece|\bOP\d{2}\b|\bST\d{2}\b|luffy|zoro/i],
  ['Naruto', /naruto|kayou/i],
  ['MTG', /magic the gathering|\bMTG\b/i],
  ['Sports', /baseball|basketball|football|hockey|soccer|panini|topps|bowman|prizm|donruss|upper deck|\bRC\b|rookie/i],
  ['Pokemon', /pok[eé]mon|pikachu|charizard/i],
];

export function guessCategoryFromText(text: string): string {
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'Pokemon';
}

// Words that describe condition or grading rather than which card it is
const NOISE = new Set(['psa', 'bgs', 'cgc', 'sgc', 'gem', 'mint', 'mt', 'nm', 'near', 'raw', 'graded', 'card', 'cards', 'pokemon', 'the', 'and', 'tcg', 'english', 'japanese', 'holo', 'rare', 'lp', 'mp', 'or', 'better']);

function cardTokens(title: string): Set<string> {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9#]+/g, ' ').split(' ')
      .filter((t) => t.length >= 2 && !NOISE.has(t) && !/^(10|[1-9])$/.test(t)),
  );
}

// True when two listing titles look like the same card (so imports should combine)
export function sameCard(a: string, b: string): boolean {
  const ta = cardTokens(a);
  const tb = cardTokens(b);
  if (ta.size === 0 || tb.size === 0) return true;
  const shared = [...ta].filter((t) => tb.has(t)).length;
  return shared / Math.min(ta.size, tb.size) >= 0.5;
}

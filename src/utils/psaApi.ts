import type { Category } from '../types/portfolio';

// PSA Public API (https://www.psacard.com/publicapi). Allows browser calls
// (CORS *), needs a bearer token from the user's PSA account, and caps each
// account at 100 calls a day — so results are cached in localStorage.
const BASE = 'https://api.psacard.com/publicapi';
const TOKEN_KEY = 'portfolio-psa-token';
const CACHE_KEY = 'portfolio-psa-cache';
const POP_CACHE_MS = 24 * 60 * 60 * 1000;

export class PsaLookupError extends Error {}

interface PsaCert {
  CertNumber: string;
  SpecID: number;
  Year?: string;
  Brand?: string;
  Category?: string;
  CardNumber?: string;
  Subject?: string;
  Variety?: string;
  CardGrade?: string;
  GradeDescription?: string;
}

interface PsaPop {
  Total: number;
  Auth: number;
  Grade9: number;
  Grade10: number;
}

export interface PsaLookup {
  certNumber: string;
  specId: number;
  name: string;
  category: Category;
  slabGrade: string;
  graded: number; // total graded copies (authentic-only excluded)
  psa10: number;
  psa9: number;
  rate10: number;
  rate9: number;
  fetchedAt: string;
}

interface Cache {
  certs: Record<string, PsaCert>;
  pops: Record<string, { pop: PsaPop; at: number }>;
}

export function getPsaToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setPsaToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token.trim());
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

function readCache(): Cache {
  try {
    return { certs: {}, pops: {}, ...JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') };
  } catch {
    return { certs: {}, pops: {} };
  }
}

function writeCache(cache: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage errors
  }
}

// Accepts a bare cert number or a psacard.com/cert/… link. eBay links can't be
// read from the browser, so point the user at where the cert number lives.
export function parseCertInput(text: string): { cert: string } | { error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { error: 'Paste a PSA cert number.' };
  if (/ebay\./i.test(trimmed)) {
    return { error: 'eBay links can’t be read from the site yet. Copy the cert number from the listing’s item specifics (“Certification Number”) or the slab photo.' };
  }
  const fromPsaLink = trimmed.match(/psacard\.com\/cert\/(\d+)/i);
  const digits = (fromPsaLink?.[1] ?? trimmed).replace(/[\s-]/g, '');
  if (!/^\d{7,10}$/.test(digits)) return { error: 'That doesn’t look like a PSA cert number — it’s 8 or 9 digits on the slab label.' };
  return { cert: digits };
}

async function call<T>(path: string, token: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { headers: { authorization: `bearer ${token}` } });
  } catch {
    throw new PsaLookupError('Couldn’t reach PSA. Check your connection and try again.');
  }
  if (response.status === 429) throw new PsaLookupError('PSA’s daily limit (100 lookups) is used up. It resets tomorrow.');
  if (response.status === 401 || response.status === 403 || response.status === 500) {
    throw new PsaLookupError('PSA rejected the API key. Check it under “PSA key”.');
  }
  if (response.status === 204) throw new PsaLookupError('PSA returned nothing for that cert number.');
  if (!response.ok) throw new PsaLookupError(`PSA returned an error (${response.status}).`);
  return response.json() as Promise<T>;
}

const SPORTS = /baseball|basketball|football|hockey|soccer|panini|topps|bowman|upper deck|donruss|prizm/i;

function guessCategory(cert: PsaCert): Category {
  const text = `${cert.Category ?? ''} ${cert.Brand ?? ''} ${cert.Subject ?? ''}`;
  if (/pok[eé]mon/i.test(text)) return 'Pokemon';
  if (/one piece/i.test(text)) return 'One Piece';
  if (/magic|mtg/i.test(text)) return 'MTG';
  if (/naruto/i.test(text)) return 'Naruto';
  if (SPORTS.test(text)) return 'Sports';
  return 'Pokemon';
}

function cardName(cert: PsaCert): string {
  const parts = [cert.Year, cert.Brand, cert.Subject, cert.Variety, cert.CardNumber && `#${cert.CardNumber}`];
  return parts.filter((p) => p && p.trim()).join(' ').replace(/\s+/g, ' ').trim();
}

export async function lookupCert(certNumber: string, token: string): Promise<PsaLookup> {
  if (!token) throw new PsaLookupError('Add your PSA API key first.');
  const cache = readCache();

  let cert = cache.certs[certNumber];
  if (!cert) {
    const body = await call<{ PSACert?: PsaCert; IsValidRequest?: boolean; ServerMessage?: string }>(`/cert/GetByCertNumber/${certNumber}`, token);
    if (body.IsValidRequest === false || !body.PSACert?.SpecID) {
      throw new PsaLookupError(body.ServerMessage === 'No data found' ? 'No PSA card with that cert number.' : body.ServerMessage || 'PSA couldn’t find that cert.');
    }
    cert = body.PSACert;
    cache.certs[certNumber] = cert;
  }

  const cachedPop = cache.pops[cert.SpecID];
  let pop = cachedPop && Date.now() - cachedPop.at < POP_CACHE_MS ? cachedPop.pop : undefined;
  if (!pop) {
    const body = await call<{ PSAPop?: PsaPop }>(`/pop/GetPSASpecPopulation/${cert.SpecID}`, token);
    if (!body.PSAPop) throw new PsaLookupError('PSA has no population data for this card.');
    pop = body.PSAPop;
    cache.pops[cert.SpecID] = { pop, at: Date.now() };
  }
  writeCache(cache);

  const graded = Math.max(0, pop.Total - (pop.Auth ?? 0));
  return {
    certNumber,
    specId: cert.SpecID,
    name: cardName(cert),
    category: guessCategory(cert),
    slabGrade: cert.GradeDescription || cert.CardGrade || '',
    graded,
    psa10: pop.Grade10,
    psa9: pop.Grade9,
    rate10: graded > 0 ? pop.Grade10 / graded : 0,
    rate9: graded > 0 ? pop.Grade9 / graded : 0,
    fetchedAt: new Date().toISOString(),
  };
}

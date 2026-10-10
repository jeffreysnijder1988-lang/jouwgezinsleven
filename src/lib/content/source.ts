/**
 * Contentbron-abstractie.
 *
 * CONTENT_SOURCE=sanity  (standaard) → Sanity Content Lake, perspective "published".
 * CONTENT_SOURCE=fixture             → tests/fixtures/content.json (of CONTENT_FIXTURE=pad) via groq-js.
 *                                       Uitsluitend voor lokale QA zonder netwerk.
 *                                       Een fixture-build forceert noindex + robots Disallow
 *                                       en toont een TESTBUILD-balk: nooit deployen.
 *
 * Een productiebuild faalt hard als Sanity niet bereikbaar is, zodat er nooit
 * een lege site naar cPanel gaat.
 */
import { getSanityClient } from '../sanity/client';

export const contentSource: 'sanity' | 'fixture' =
  (import.meta.env.CONTENT_SOURCE || process.env.CONTENT_SOURCE) === 'fixture' ? 'fixture' : 'sanity';

export const isFixtureBuild = contentSource === 'fixture';

type Params = Record<string, unknown>;

let fixtureDocs: unknown[] | undefined;

async function loadFixtureDocs(): Promise<unknown[]> {
  if (fixtureDocs) return fixtureDocs;
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const file = path.resolve(process.cwd(), process.env.CONTENT_FIXTURE || 'tests/fixtures/content.json');
  const raw = JSON.parse(await fs.readFile(file, 'utf8')) as { _id: string }[];
  // Spiegel perspective "published": drafts en release-versies eruit.
  fixtureDocs = raw.filter((d) => !d._id.startsWith('drafts.') && !d._id.startsWith('versions.'));
  return fixtureDocs;
}

async function fixtureFetch<T>(query: string, params: Params): Promise<T> {
  const { parse, evaluate } = await import('groq-js');
  const dataset = await loadFixtureDocs();
  const tree = parse(query, { params });
  const value = await evaluate(tree, { dataset, params });
  return (await value.get()) as T;
}

const cache = new Map<string, Promise<unknown>>();

/** Eén fetch-functie voor de hele site; resultaten worden per build gecachet. */
export function fetchContent<T>(query: string, params: Params = {}): Promise<T> {
  const key = query + JSON.stringify(params);
  if (!cache.has(key)) {
    const p =
      contentSource === 'fixture'
        ? fixtureFetch<T>(query, params)
        : getSanityClient()
            .fetch<T>(query, params)
            .catch((err: Error) => {
              throw new Error(
                `[content] Sanity-query mislukt (${err.message}). Build afgebroken om een lege of onvolledige deploy te voorkomen.`,
              );
            });
    cache.set(key, p);
  }
  return cache.get(key) as Promise<T>;
}

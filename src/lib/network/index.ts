/**
 * Family Media Network — adapterlaag.
 *
 * Componenten kennen alleen het genormaliseerde NetworkItem, nooit externe API-structuren.
 * Er zijn nog GEEN live integraties: de huidige bron is de handmatige reference in Sanity
 * (networkDestination: platform + externalUrl + optioneel externalId), conform
 * NETWORK_INTEGRATIONS.md → "Tijdelijke situatie". Prijs/voorraad worden niet opgeslagen.
 *
 * Toekomstige adapters (bijv. ./lomamo.ts via Shopify Storefront API) implementeren
 * `NetworkAdapter` en worden in `adapters` geregistreerd — de contentarchitectuur
 * hoeft daarvoor niet te veranderen.
 */
import type { NetworkDestination } from '../content/types';

export type PlatformKey =
  | 'lomamo' | 'opvangkiezer' | 'welkespeeltuin' | 'welkespeeltuin-be' | 'vakantiemetjongekinderen' | 'rustmetkids'
  | 'rustigzwanger' | 'bevallingschecklist' | 'aanstaandevader' | 'jouwkraamtijd' | 'streaq';

/** live: false = site nog niet online → nergens naartoe linken (geen dode doorverwijzingen). */
export interface Platform { key: PlatformKey; name: string; url?: string; live?: boolean }

/** Publieke platformgegevens uit NETWORK_MAP.md. Alleen domeinen die daar vastliggen. */
export const PLATFORMS: Record<PlatformKey, Platform> = {
  lomamo: { key: 'lomamo', name: 'Lomamo', url: 'https://lomamo.nl' },
  opvangkiezer: { key: 'opvangkiezer', name: 'Opvangkiezer', url: 'https://opvangkiezer.nl' },
  welkespeeltuin: { key: 'welkespeeltuin', name: 'WelkeSpeeltuin', url: 'https://welkespeeltuin.nl', live: false },
  'welkespeeltuin-be': { key: 'welkespeeltuin-be', name: 'WelkeSpeeltuin.be', url: 'https://welkespeeltuin.be', live: false },
  vakantiemetjongekinderen: { key: 'vakantiemetjongekinderen', name: 'Vakantiemetjongekinderen.nl', url: 'https://vakantiemetjongekinderen.nl' },
  /** Vervallen (24-10-2026): vervangen door vakantiemetjongekinderen. Oude references linken nergens meer heen. */
  rustmetkids: { key: 'rustmetkids', name: 'Rustmetkids', url: 'https://rustmetkids.nl', live: false },
  rustigzwanger: { key: 'rustigzwanger', name: 'RustigZwanger' },
  bevallingschecklist: { key: 'bevallingschecklist', name: 'Bevallingschecklist', url: 'https://bevallingschecklist.nl' },
  aanstaandevader: { key: 'aanstaandevader', name: 'Aanstaandevader', url: 'https://aanstaandevader.nl' },
  jouwkraamtijd: { key: 'jouwkraamtijd', name: 'JouwKraamtijd', url: 'https://jouwkraamtijd.nl' },
  streaq: { key: 'streaq', name: 'Streaq' },
};

export interface NetworkItem {
  key: string;
  platform: Platform;
  title: string;
  description?: string;
  url: string;
  relationType?: string;
  priority: number;
}

export interface NetworkAdapter {
  platform: PlatformKey;
  /** Haalt actuele publieke data op. Moet bij storing [] teruggeven, nooit throwen. */
  resolve(destinations: NetworkDestination[]): Promise<NetworkItem[]>;
}

const adapters: Partial<Record<PlatformKey, NetworkAdapter>> = {};

function isSafeHttpUrl(u?: string | null): u is string {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Handmatige reference → NetworkItem. Onvolledige items worden weggelaten (niets verzinnen). */
function fromManualReference(d: NetworkDestination): NetworkItem | null {
  const platform = PLATFORMS[d.platform as PlatformKey];
  const url = isSafeHttpUrl(d.externalUrl) ? d.externalUrl : platform?.url;
  if (!platform || !url || platform.live === false) return null;
  return {
    key: d._key,
    platform,
    title: d.title || platform.name,
    description: d.description ?? undefined,
    url,
    relationType: d.relationType ?? undefined,
    priority: d.priority ?? 0,
  };
}

export async function resolveNetworkItems(destinations?: NetworkDestination[] | null): Promise<NetworkItem[]> {
  if (!destinations?.length) return [];
  const items: NetworkItem[] = [];
  for (const d of destinations) {
    const adapter = adapters[d.platform as PlatformKey];
    if (adapter) {
      try {
        items.push(...(await adapter.resolve([d])));
        continue;
      } catch {
        // Storing extern platform: val terug op handmatige reference.
      }
    }
    const manual = fromManualReference(d);
    if (manual) items.push(manual);
  }
  return items.sort((a, b) => b.priority - a.priority);
}

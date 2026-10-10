/**
 * Sanity-client voor build-time data.
 *
 * - perspective "published": drafts en release-versies komen NOOIT in de build.
 * - useCdn false: statische build moet de actuele gepubliceerde stand gebruiken.
 * - Token is optioneel (dataset is public) en wordt alleen server-side/build-time gebruikt.
 */
import { createClient, type SanityClient } from '@sanity/client';

const env = import.meta.env;

export const sanityConfig = {
  projectId: env.SANITY_PROJECT_ID || 'amxuxo0p',
  dataset: env.SANITY_DATASET || 'production',
  apiVersion: env.SANITY_API_VERSION || '2025-02-19',
};

let client: SanityClient | undefined;

export function getSanityClient(): SanityClient {
  if (!client) {
    client = createClient({
      ...sanityConfig,
      useCdn: false,
      perspective: 'published',
      token: env.SANITY_READ_TOKEN || undefined,
      stega: false,
    });
  }
  return client;
}

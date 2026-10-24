import { createImageUrlBuilder } from '@sanity/image-url';
import { sanityConfig } from './client';
import type { SanityImage } from '../content/types';

const builder = createImageUrlBuilder({ projectId: sanityConfig.projectId, dataset: sanityConfig.dataset });

export function hasImage(image?: SanityImage | null): image is SanityImage {
  return Boolean(image?.asset?._id || image?.asset?.url);
}

/** Bouwt een geoptimaliseerde URL (auto-format → WebP/AVIF waar ondersteund). */
export function imageUrl(image: SanityImage, width: number, height?: number, format?: 'jpg' | 'png'): string {
  let b = builder.image(image as never).width(width).quality(78).fit('crop');
  // Vast formaat voor social crawlers (og:image), die niet altijd WebP/AVIF ondersteunen.
  b = format ? b.format(format) : b.auto('format');
  if (height) b = b.height(height);
  return b.url();
}

/** srcset voor responsive afbeeldingen met vaste aspect-ratio. */
export function imageSrcSet(image: SanityImage, widths: number[], ratio?: number): string {
  return widths
    .map((w) => `${imageUrl(image, w, ratio ? Math.round(w / ratio) : undefined)} ${w}w`)
    .join(', ');
}

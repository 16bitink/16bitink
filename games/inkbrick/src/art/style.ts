/**
 * The one switch between InkBrick's two art sets.
 *   'ink'   pen-and-ink, InkFish's look: most keys drawn in code (src/render/ink), the
 *           characters generated (./img).
 *   'paint' the first watercolour set (./img-paint), kept for comparison and rollback.
 * Dev pages may override it with ?art=ink|paint.
 */
export type ArtStyle = 'ink' | 'paint';

const DEFAULT_STYLE: ArtStyle = 'ink';

function fromQuery(): ArtStyle | null {
  if (typeof location === 'undefined') return null;
  const q = new URLSearchParams(location.search).get('art');
  return q === 'ink' || q === 'paint' ? q : null;
}

export const ART_STYLE: ArtStyle = fromQuery() ?? DEFAULT_STYLE;

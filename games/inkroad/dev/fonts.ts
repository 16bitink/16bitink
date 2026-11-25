import caveatUrl from '../../../apps/web/src/assets/fonts/caveat.woff2?url';
import serifUrl from '../../../apps/web/src/assets/fonts/source-serif-4.woff2?url';

/** Loads the site's two fonts for the dev pages (the website brings them itself). */
export async function loadFonts(): Promise<void> {
  const faces = [new FontFace('Caveat', `url(${caveatUrl}) format('woff2')`, { weight: '400 700' }), new FontFace('Source Serif 4', `url(${serifUrl}) format('woff2')`, { weight: '200 900' })];
  await Promise.all(faces.map((f) => f.load().then((l) => document.fonts.add(l)).catch((e) => console.warn('[dev] font', e))));
}

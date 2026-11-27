import type { Cell } from '../../sim/types';

/** What the bots know about each city's map: big roads worth a thought, and sensible lines. */
const cell = (gx: number, gy: number): Cell => ({ gx, gy });

/** Big roads worth a thought, per city. */
interface Idea { readonly from: number; readonly cells: readonly Cell[] }
/** Big roads worth a thought, per city, and the year they start to make sense. */
export const ROADS: Readonly<Record<string, readonly Idea[]>> = {
  saffron: [
    { from: 1, cells: [cell(12, 24), cell(12, 18)] }, { from: 2, cells: [cell(32, 24), cell(36, 24), cell(36, 18)] },
    { from: 7, cells: [cell(32, 24), cell(45, 24)] }, { from: 3, cells: [cell(14, 8), cell(8, 8), cell(8, 18)] },
    { from: 7, cells: [cell(36, 8), cell(45, 8)] },
  ],
  harbour: [
    { from: 1, cells: [cell(20, 14), cell(20, 25)] }, { from: 1, cells: [cell(36, 14), cell(36, 25)] }, { from: 2, cells: [cell(28, 7), cell(48, 7)] }, { from: 2, cells: [cell(14, 25), cell(14, 30)] },
    { from: 3, cells: [cell(14, 15), cell(14, 7)] }, { from: 3, cells: [cell(42, 11), cell(42, 19)] },
  ],
};

export const BUSES: Readonly<Record<string, readonly (readonly string[])[]>> = {
  saffron: [
    ['Blueprint Offices', 'Acacia Gardens', 'Pepper Market'], ['Almond Flats', 'Rosewater Flats', 'Saffron School', 'Pepper Market'],
    ['Shell Row', 'Far Shore Offices', 'Creek Villas', 'Stamp Office', 'Kite Street', 'Blueprint Offices'], ['Stapler Offices', 'The Great Mall', 'Almond Flats', 'Saltbush Street', 'Cumin Court'],
    ['Harbour Flats', 'Pearl Villas', 'Pepper Market', 'Beach Shops', 'Ink Offices'],
  ],
  isles: [
    ['Orchid Row', 'Lantern Market', 'Folded Offices', 'Abacus Offices'], ['Biscuit Lane', 'Teapot Street', 'Isle School', 'Silk Market', 'Cloud Row'],
    ['Mango Court', 'Kettle Street', 'Banyan Flats', 'Saucer Lane'], ['Mirror Row', 'Glass Shops', 'Crane Row', 'Anemone Flats'],
  ],
  harbour: [
    ['Weavers Green', 'Tin Lane', 'Herring Market', 'Anchor Lane', 'Barrel Street'], ['Loom Street', 'Ledger Offices', 'Lantern Offices', 'Chart Offices'],
    ['North Hospital', 'Tar Street', 'Compass House', 'Chart Offices'], ['Harbour School', 'Rudder Flats', 'Captains Row', 'Herring Market'], ['Spindle Flats', 'Weavers Green', 'Ropemakers Row'],
  ],
};

export const METROS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  isles: [['Lantern Market', 'Comet Offices', 'Folded Offices', 'Abacus Offices'], ['Biscuit Lane', 'Isle School', 'Comet Offices', 'Silk Market']],
  saffron: [['Blueprint Offices', 'Pepper Market', 'Creek Villas', 'Far Shore Offices'], ['Almond Flats', 'Acacia Gardens', 'Pepper Market', 'Ink Offices']],
};

/** Quays in the order a boat would visit them. */
export const BOATS: Readonly<Record<string, readonly (readonly Cell[])[]>> = {
  harbour: [[cell(8, 30), cell(18, 26), cell(28, 26), cell(38, 27), cell(44, 30)]],
};

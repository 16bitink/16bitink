import type { Pt } from '../logic/vec';
import ch1Art from '../art/pixel/ui/maps/ch1.png?url';
import ch2Art from '../art/pixel/ui/maps/ch2.png?url';
import ch3Art from '../art/pixel/ui/maps/ch3.png?url';
import ch4Art from '../art/pixel/ui/maps/ch4.png?url';
import ch5Art from '../art/pixel/ui/maps/ch5.png?url';

/**
 * The chapter maps: one painted overview per chapter (PixelLab, 688 × 384,
 * drawn at 2 world px per art px), with the ten level spots placed on its
 * painted road. Spots are in world px over the painting (art px × 2).
 */
export const MAP_ART_W = 688;
export const MAP_ART_H = 384;
export const MAP_ART_SCALE = 2;
export const MAP_W = MAP_ART_W * MAP_ART_SCALE;
export const MAP_H = MAP_ART_H * MAP_ART_SCALE;

/**
 * The world rect the camera must show: the spots plus room for their labels
 * (its centre is the painting's centre). The spots keep inside it so a phone's
 * view, with the top panel and the chapter chips over it, shows them all.
 */
export const SPOT_BOX = { x: 148, y: 154, w: 1080, h: 480 } as const;

/** A chapter's map: its painting and the ten level spots on it (spot i is the chapter's level i + 1). */
export interface ChapterMap {
  readonly art: string;
  readonly spots: readonly Pt[];
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

const pts = (list: readonly (readonly [number, number])[]): Pt[] => list.map(([x, y]) => ({ x, y }));

/** By chapter index (0 = chapter 1). */
export const CHAPTER_MAPS: readonly ChapterMap[] = [
  // Meadowlands: the farm, the barn, the village lane, the covered bridge, the woods, the old mill, the
  // valley road, the rail yard's hangar, the rocky pass and the hilltop fort.
  { art: ch1Art, box: SPOT_BOX, spots: pts([[240, 545], [398, 440], [405, 335], [490, 278], [790, 410], [850, 495], [975, 548], [1075, 450], [1030, 315], [1110, 228]]) },
  // Dust Flats: the oil town, the canyon, the pipeline, the water depot, the wells, the dunes, Rook's mesa,
  // the town square, the prison road and the crawler's gate.
  { art: ch2Art, box: SPOT_BOX, spots: pts([[200, 535], [280, 430], [400, 385], [520, 465], [630, 345], [772, 475], [870, 420], [968, 420], [1095, 480], [1145, 385]]) },
  // Mirefen: the causeway past the hover dock, the stilt village, the barge, the reed watch, the sluice,
  // the islands, Grim's channel, the lock, the far bank and the Ironclad's lagoon.
  { art: ch3Art, box: SPOT_BOX, spots: pts([[230, 535], [345, 410], [455, 462], [590, 420], [700, 430], [930, 375], [1050, 520], [1150, 430], [1105, 325], [1075, 212]]) },
  // Frostridge: the frozen lake, the cabins, the pass below the cliffs, the laser lab, the ridges, the
  // generator, the avalanche slope, the signal mast, the depots and the rail-gun train's line.
  { art: ch4Art, box: SPOT_BOX, spots: pts([[215, 520], [345, 398], [500, 520], [640, 358], [790, 485], [880, 368], [1000, 475], [1100, 495], [1160, 360], [1035, 235]]) },
  // Deepwood: the sawmill, the burnt trees, the Hive works, the log bridge, the felled road, the forest
  // fort, the clearing, the Hive cells, the Brigade camp and the Harvester's logging front.
  { art: ch5Art, box: SPOT_BOX, spots: pts([[215, 470], [345, 400], [460, 452], [560, 376], [830, 383], [975, 470], [1065, 565], [1158, 465], [1150, 320], [1060, 238]]) },
];

export const chapterMap = (index: number): ChapterMap => CHAPTER_MAPS[index] ?? CHAPTER_MAPS[0]!;

import { GUNS, type DriveFamily, type GunFamily } from './parts';

/** Damage × this, by the target's drive (design doc, "Counters"; the Hover column and the Flamer row from chapter 3, the Laser row from chapter 4). */
export const COUNTERS: Readonly<Record<GunFamily, Readonly<Record<DriveFamily, number>>>> = {
  machinegun: { wheels: 1.3, halftracks: 0.9, tracks: 0.5, hover: 1.3 },
  cannon: { wheels: 1.0, halftracks: 1.0, tracks: 0.9, hover: 1.0 },
  rockets: { wheels: 0.7, halftracks: 1.1, tracks: 1.3, hover: 0.6 },
  mortar: { wheels: 0.9, halftracks: 1.0, tracks: 0.8, hover: 1.2 },
  flamer: { wheels: 1.1, halftracks: 1.0, tracks: 0.9, hover: 1.3 },
  // Chapter 4: a precise long beam. Heat already bites heavies (their heat armour is low), so the heavy treads soak a little;
  // Hover's thin skirts burn through.
  laser: { wheels: 1.0, halftracks: 0.95, tracks: 0.85, hover: 1.2 },
  // Chapter 5: a heavy kinetic slug, an anti-armour gun: it punches through tracked heavies; light, fast drives are hard to pin.
  rail: { wheels: 0.9, halftracks: 1.0, tracks: 1.15, hover: 0.85 },
};

/** Heat guns (the Flamer) meet a hull's heat armour; everything else its kinetic armour. */
export const isHeat = (gun: GunFamily): boolean => GUNS[gun].heat === true;

/** The armour a hit from `gun` meets on a tank with these stats. */
export function armourAgainst(s: { readonly armour: number; readonly heatArmour: number }, gun: GunFamily): number {
  return isHeat(gun) ? s.heatArmour : s.armour;
}

/** The floor: a hit always does at least a third of its countered damage. */
export const ARMOUR_FLOOR = 0.33;

/** Damage a hit of `dmg` from `gun` does to a tank on `drive` with `armour`. */
export function damageTaken(dmg: number, gun: GunFamily, drive: DriveFamily, armour: number): number {
  const c = dmg * COUNTERS[gun][drive];
  return Math.max(c - armour, c * ARMOUR_FLOOR);
}

/** The gun that counters a drive best. */
export function counterGun(drive: DriveFamily): GunFamily {
  const guns = Object.keys(COUNTERS) as GunFamily[];
  return guns.reduce((best, g) => (COUNTERS[g][drive] > COUNTERS[best][drive] ? g : best), guns[0]!);
}

/** Structure damage: only brick-breakers hurt brick; wood takes anything; rock and stone take nothing. */
export type Material = 'brick' | 'wood' | 'stone' | 'rock' | 'tree' | 'metal' | 'fuel';

export function structureDamage(dmg: number, material: Material, breaksBrick: boolean): number {
  switch (material) {
    case 'wood':
    case 'tree':
    case 'fuel':
      return dmg;
    case 'brick':
    case 'metal':
      return breaksBrick ? dmg : 0;
    default:
      return 0;
  }
}

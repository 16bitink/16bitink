/** Draw order, bottom to top. Uprights add their foot's plan y. */
export const DEPTH = {
  ground: 0, flat: 10, shadow: 15, cars: 20, upright: 1000, night: 9000, lights: 9100, marks: 9200, ghost: 9250, fx: 9300,
} as const;

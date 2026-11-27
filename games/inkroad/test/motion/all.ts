/** Every built scenario: the worked examples, then each group's file. The CLI, the replay page and the test read this. */
import type { Scenario } from './lab';
import { SCENARIOS as CORE } from './scenarios';
import { CITY } from './scenarios.city';
import { DRIVING } from './scenarios.driving';
import { PARKING } from './scenarios.parking';
import { TURNS } from './scenarios.turns';

export const ALL_SCENARIOS: readonly Scenario[] = [...CORE, ...PARKING, ...DRIVING, ...CITY, ...TURNS];

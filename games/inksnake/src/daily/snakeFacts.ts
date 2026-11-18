import type { EventId } from '@16bitink/game-sdk';
import type { SnakeId } from '../logic/species';

/** One true fact per snake, for its album card. */
export const SNAKE_FACTS: Readonly<Record<SnakeId, string>> = {
  corn: 'Named after the corn cribs where farmers found it hunting mice.',
  hognose: 'When threatened it rolls over and plays dead, tongue out.',
  sidewinder: 'It moves sideways in looping waves, touching the hot sand only in a few spots.',
  eggeater: 'It swallows eggs whole and cracks the shell with bony points inside its neck.',
  flying: 'It glides from tree to tree by flattening its body into a ribbon.',
  krait: 'It hunts eels at sea but comes ashore to rest and lay its eggs.',
  spidertail: 'The tip of its tail looks like a spider, to lure birds close.',
  adder: "Britain's only venomous snake. It hibernates through the winter.",
  cobra: 'The longest venomous snake in the world. It eats mostly other snakes.',
  anaconda: 'One of the heaviest snakes on Earth. It spends much of its life in water.',
  candycane: 'A corn snake colour form with no black pigment: red saddles on white.',
  rainbowboa: 'Its scales shimmer like a rainbow: tiny ridges on them split the light.',
  goldentree: 'Like its cousin the paradise tree snake, it can glide between trees.',
  rosyboa: 'A small, gentle boa of the deserts of the American Southwest and Mexico.',
  greenpython: 'Its babies hatch yellow or red and turn green as they grow up.',
  earthsnake: 'A small, shy snake that spends most of its life under logs and leaves.',
  yellowsea: 'It lives its whole life out at sea, drifting with the currents.',
  blackhognose: 'Some eastern hognose snakes are almost all black.',
};

/** Each event's snake in InkSnake (docs/inksnake-daily.md), for its teaser; null: the place's own (or your pick). */
export const EVENT_SNAKE: Readonly<Record<EventId, SnakeId | null>> = {
  christmasEve: 'candycane', christmas: 'candycane', boxingDay: 'candycane',
  newYearsEve: 'rainbowboa', newYear: 'rainbowboa', lunarNewYear: 'goldentree', valentines: 'rosyboa',
  wildlifeDay: null, stPatricks: 'greenpython', easter: 'eggeater', earthDay: 'earthsnake', oceansDay: 'yellowsea',
  snakeDay: null, catDay: 'corn', halloween: 'blackhognose', diwali: 'cobra',
};

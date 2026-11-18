/** Every tuning number of the physics, in board px, seconds and cells (docs/inkbrick-design.md). */
import { BALL_RADIUS, CELL } from './types';

export const BALL_R = BALL_RADIUS;
export const BALL_SPEED = 480;
export const BALL_SPEED_MAX = 640;
export const SPEED_UP_EVERY = 20;
export const SPEED_UP = 1.05;
/** A ball never moves more than this per sub-step (so it can't skip a 15 px brick). */
export const SUBSTEP_PX = 2.5;
/** The smallest share of the speed kept vertical (no endless side-to-side runs). */
export const MIN_VY_SHARE = 0.25;
/**
 * The smallest share kept horizontal after a stone bounce (about 11.5 degrees off vertical): a
 * straight shot into a hole rattles around inside instead of coming straight back out.
 */
export const MIN_VX_SHARE = 0.2;
/** Bounces off walls and stone in a row, without a brick or the raft, before the loop breaker turns a stone. */
export const LOOP_BOUNCES = 10;
export const LOOP_NUDGE_DEG = 7;

export const PADDLE_Y = 900;
export const PADDLE_H = 15;
export const PADDLE_W = 90;
export const PADDLE_W_WIDE = 140;
export const MAX_BOUNCE_DEG = 60;
export const LAUNCH_X = 270;

export const START_LIVES = 3;
export const MAX_BALLS = 300;
export const SPLIT_DEG = 20;

export const KEG_RADIUS = 3 * CELL;
export const KEG_CHAIN_DELAY = 0.08;
export const ICE_DELAY = 0.15;

export const PICKUP_FALL = 180;
export const PICKUP_W = 30;
export const PICKUP_H = 15;
export const WIDE_SECONDS = 20;
export const FIRE_SECONDS = 8;
export const PLUS3_SPREAD_DEG = 25;

export const CRUMBLE_SHARE = 0.05;
export const CRUMBLE_IDLE = 8;

export const SPINNER_HALF_THICK = 4;
export const WHIRL_RADIUS = 12;
export const WHIRL_COOLDOWN = 0.25;
export const BOSS_HIT_COOLDOWN = 0.3;
export const BOSS_DEFAULT = { x: 15, y: 4, w: 6, h: 3 } as const;

/** The probe (in cells) that marks "outside": any gap narrower than this is a hole. */
export const INSIDE_PROBE = 5;
/** Rows a brick may use. */
export const BRICK_ROW_MIN = 3;
export const BRICK_ROW_MAX = 50;
export const MAX_BRICKS = 1500;

// Goals, rules of the day and the new pieces (docs/inkbrick-design.md "Variety", 2026-11-18).
/** current: sideways pull, px/s^2 (speed kept). heavy: downward pull, px/s^2. */
export const CURRENT_PULL = 120;
export const HEAVY_PULL = 160;
export const SPEEDY_MUL = 1.25;
export const SLOW_MUL = 0.85;
export const TINY_RAFT_W = 60;
export const TINY_RAFT_W_WIDE = 100;
export const WIDE_RAFT_W = 130;
export const BIG_STONE_MUL = 1.6;
/** sticky: the caught stone is thrown by itself after this long. */
export const STICKY_HOLD = 1.5;
/** twoStones: the two stones never fly closer than this to each other (degrees off straight up). */
export const TWO_STONES_MIN_DEG = 4;
/** A bumper's kick: this share of the speed added along its normal, then the speed restored. */
export const BUMP_KICK = 0.35;
export const BUMPER_R_MIN = 14;
export const BUMPER_R_MAX = 24;
export const LEVER_COOLDOWN = 0.4;
/** A crab scuttles this much faster for CRAB_FAST_SECONDS after a hit. */
export const CRAB_FAST_MUL = 2;
export const CRAB_FAST_SECONDS = 1;
/** A pearl (goal or daily) is taken when a stone's centre comes this close to the pearl's centre plus the stone's radius. */
export const PEARL_R = 6;
/** Rising Tide: the field rises back this many cells after a flood. */
export const TIDE_RISE = 6;
/** Nothing the tide moves goes below this row (the raft is on row 60). */
export const TIDE_FLOOR_ROW = 57;
export const STONES_MIN = 3;
export const STONES_MAX = 6;
export const PEARLS_MIN = 3;
export const PEARLS_MAX = 5;

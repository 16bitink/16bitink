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

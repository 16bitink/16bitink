// InkBrick autopilot: the dev page (games/inkbrick/dev/main.ts) runs with
// ?bot=skilled, so the engine's own bot moves Skip's raft, just as it does in
// the level lab. This file only reports when the level is on screen, hides
// the HUD, and aims the camera: up and down the board after the stones, from
// Skip's throw to the bricks, slowly enough that a bounce doesn't jerk it.
window.__bot = (() => {
  /** Share of the way to the stones the camera moves each frame (the recorder eases again). */
  const FOLLOW = 0.06;
  let hidden = false;
  let camY = null;
  const run = () => window.__app?.run ?? null;
  const brokeIn = () => window.__ib?.marks.breakIn !== undefined;
  function hideUi() {
    if (hidden) return;
    const style = document.createElement('style');
    style.textContent = '.hud { display: none !important; }';
    document.head.append(style);
    hidden = true;
  }
  return {
    ready() {
      const ok = Boolean(window.__ready && window.__ib && run()?.layout);
      if (ok) hideUi();
      return ok;
    },
    start() {
      throw new Error('InkBrick levels are picked in the URL (?level=N), not by start()');
    },
    status() {
      const v = run()?.port.view();
      return v ? { breakIn: brokeIn(), balls: v.balls.length, broken: v.broken, lives: v.lives } : null;
    },
    focus() {
      const l = run()?.layout;
      if (!l) return null;
      const { balls } = run().port.view();
      // The middle stone: a few strays near the raft don't drag the shot off the break-in.
      const mid = balls.map((b) => b.y).sort((p, q) => p - q)[Math.floor(balls.length / 2)];
      if (mid !== undefined) camY = camY === null ? mid : camY + (mid - camY) * FOLLOW;
      const y = camY ?? 0;
      return { x: l.x + l.w / 2, y: l.y + y * l.scale };
    },
    steer() {
      return null;
    },
  };
})();

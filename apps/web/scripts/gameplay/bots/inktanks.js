// InkTanks autopilot: the mission dev page (games/inktanks/dev/mission.html)
// runs with ?bot=1, so the game's own sim bot drives the player's tank, just
// as it does in the level lab. This file only reports when the mission is
// on screen and hides the HUD and panels, so the shot is the battlefield.
window.__bot = (() => {
  let hidden = false;
  function hideUi() {
    if (hidden) return;
    const style = document.createElement('style');
    style.textContent = '#hud, #overlay { display: none !important; }';
    document.head.append(style);
    hidden = true;
  }
  return {
    ready() {
      const ok = Boolean(window.__ready && window.match && window.scene);
      if (ok) hideUi();
      return ok;
    },
    start() {
      throw new Error('InkTanks levels are picked in the URL (?level=N), not by start()');
    },
    status() {
      const m = window.match;
      if (!m) return null;
      return { over: m.over, hp: m.player ? Math.round(m.player.hp) : null };
    },
    steer() {
      return null;
    },
  };
})();

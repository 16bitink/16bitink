# Phones: the playbook

The sizes and rules every game follows on a phone. The owner tested InkGecko (Nov 11), InkSnake (Nov 18) and InkTanks (Nov 20) on a phone and said the same thing each time: the view is too far out, and the text and buttons are too small. This page sets one standard so the next game starts there. Each game's own doc covers its layout ([inksnake-design.md](inksnake-design.md#phone-ui-sizes), [inktanks-design.md](inktanks-design.md#controls)).

The numbers live in code in `packages/game-sdk/src/phone.ts`. Import them from `@16bitink/game-sdk`; don't copy them.

## What counts as a phone

A screen whose **short side is under 500 CSS px**, held either way (`isPhone`). For CSS, `PHONE_MEDIA` is the same test with a touch screen (`pointer: coarse`). Tablets and laptops keep the desktop layout.

## The sizes

All sizes are in CSS px. On the web a CSS px is Apple's pt and Google's dp, so the platform guidelines carry over as they are.

| What | Phone minimum | Code | Source |
|---|---|---|---|
| Any tap target | 44 × 44 | `TOUCH.min` | Apple HIG (44 pt), WCAG 2.5.5 (44 px, AAA) |
| Main actions (Play, Start, map nodes) | 48 × 48 | `TOUCH.comfy` | Material (48 dp) |
| Gap between two targets | 8 | `TOUCH.gap` | Material (8 dp) |
| Body text: objectives, card text, button labels | 16 | `TEXT_MIN.body` | The usual mobile floor |
| Small text: captions, counts, hints, lists | 14 | `TEXT_MIN.small` | The usual floor is 12–14 |
| Thumbstick base / knob | 120 / 44 | `STICK_MIN` | A thumb's reach; the knob is a target |
| Play view: CSS px per art px | 0.9 or more | `PHONE_WORLD_CSS_MIN` | Owner's playtests |

**Font adjustments.** Use `minTextPx(role, pixelDesign?)` and don't work the numbers out by hand.

- **Hand lettering** with a small x-height (Caveat, in InkSnake) gets 2 px more: 18 body, 16 small.
- **Pixel fonts** stay sharp only at whole or half multiples of their design size. A 12 px pixel font (Ark Pixel 12 in InkTanks and InkHeroes) is **24 px** for body text and buttons and **18 px** (1.5×) for small text. Its 1× size (12 px) is for laptops only. A narrow card's title may use the small size when 24 px would spill out of the card.

## The rules

1. **Zoom the play view in. Don't shrink the board to fit.** On a phone the player's piece should look about as big as it does on a laptop. Follow the player, or let the map pan. In pixel-art games, choose a whole number of device px per art px that gives at least `PHONE_WORLD_CSS_MIN` CSS px. InkTanks: `src/app/stageSize.ts`, which shows about 360–430 art px of field on a phone on its side.
2. **Keep only the essentials, and draw them bigger.** Drop what repeats elsewhere instead of shrinking everything. Examples: InkTanks hides the map's title panel because the chapter chips already show the chapter. InkTanks' workshop tabs say only "Gun", "Hull" and so on. InkGecko's level card has no board preview.
3. **Scope phone styles in one layer.** Put them in one phone-only stylesheet or sizer, loaded last, so the laptop layout never changes (InkTanks: `src/ui/phoneCss.ts`, InkSnake: `src/scenes/uiSizes.ts`).
4. **Keep the HUD in free space.** Put it beside the board or in a strip, never over the play area or under the thumbs.
5. **Every action is a button.** Firing is a button or a held stick, never "pull and let go". Hide key caps (`kbd`) and "Press Q" hints on touch screens, and say "Tap Repair" instead.
6. **Sound can always be turned off in two taps, from anywhere.** Put a toggle on the menu, on the map, and on the pause card. On a keyboard, M toggles it. The setting is saved.
7. **Phones play on their side** when the game is wide. If the phone is held upright, cover the game with "Turn your phone sideways" and pause. A tall game (InkBrick) is the other way round: locked upright, and "Turn your phone upright" when held on its side. The play page locks to the game's `orientation` in `data/games.ts`.
8. **Show a border round the playable area.** The scenery carries on past it, never mirrored (see the art notes in each game's doc).

## Checking a screen

Run the dev server and emulate a phone in Chrome DevTools at **844 × 390 @3** (iPhone 14 on its side) and **667 × 375 @2** (iPhone SE on its side). Then run this on each screen. It lists every target under 44 px and every text under the minimum (use 18 for a pixel font):

```js
const MIN_TEXT = 18;
({
  small: [...document.querySelectorAll('button, [data-act]')].filter((b) => b.offsetWidth && (b.offsetWidth < 44 || b.offsetHeight < 44)).map((b) => b.textContent.trim()),
  tiny: [...document.querySelectorAll('body *')].filter((e) => e.offsetWidth && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < MIN_TEXT).map((e) => e.className),
});
```

Both lists should be empty. Then look at a screenshot for anything that is clipped or overlaps: the numbers don't catch a title running under a corner button.

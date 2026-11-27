import { STICK } from './stick';

/**
 * The thumbstick (src/ui/stick.ts) in the ink look: a paper pill with an
 * inked rim and faint arrows, a coral knob. Faded at rest, full when held.
 */
const PILL_W = STICK.travel * 2 + STICK.knob;

export const CSS_STICK = `
.ikb .stick { position: absolute; z-index: 3; touch-action: none; pointer-events: auto; }
.ikb .stick-base { position: absolute; top: 50%; width: ${PILL_W}px; height: ${STICK.height}px; margin-top: ${-STICK.height / 2}px;
  border: 3px solid var(--ink); border-radius: ${STICK.height / 2}px ${STICK.height / 2 - 4}px ${STICK.height / 2 + 2}px ${STICK.height / 2 - 2}px;
  background: rgba(244, 237, 220, 0.9); box-shadow: 2px 3px 0 rgba(27, 26, 31, 0.85); opacity: 0.6; transition: opacity 0.15s; pointer-events: none; }
.ikb .stick.active .stick-base { opacity: 1; }
.ikb .stick-arrow { position: absolute; top: 50%; margin-top: -9px; border: 9px solid transparent; opacity: 0.45; }
.ikb .stick-arrow.l { left: 8px; border-right: 12px solid var(--ink); border-left: 0; }
.ikb .stick-arrow.r { right: 8px; border-left: 12px solid var(--ink); border-right: 0; }
.ikb .stick-knob { position: absolute; top: 50%; left: 50%; width: ${STICK.knob}px; height: ${STICK.knob}px; margin: ${-STICK.knob / 2}px 0 0 ${-STICK.knob / 2}px;
  border: 3px solid var(--ink); border-radius: 50% 46% 52% 48%; background: var(--coral, #c8644e); box-shadow: 1px 2px 0 var(--ink); }
.ikb .stick.active .stick-knob { box-shadow: none; }
`;

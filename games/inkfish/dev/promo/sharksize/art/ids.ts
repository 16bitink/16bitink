/** Every shark the video draws: the twelve steps, then megalodon (a ghost only). */
export type SharkId =
  | 'lanternshark' | 'cookiecutter' | 'dogfish' | 'blacktip' | 'bull' | 'mako' | 'hammerhead' | 'tiger' | 'greenland' | 'greatWhite' | 'basking' | 'whaleShark'
  | 'megalodon';

export const SHARK_IDS: readonly SharkId[] = [
  'lanternshark', 'cookiecutter', 'dogfish', 'blacktip', 'bull', 'mako', 'hammerhead', 'tiger', 'greenland', 'greatWhite', 'basking', 'whaleShark', 'megalodon',
];

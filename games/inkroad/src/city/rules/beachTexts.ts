/** What people say about the beach. Animals only, dry, one joke a line. */
export const BEACH_COMPLAINTS: Readonly<Record<string, readonly string[]>> = {
  seaClosed: [
    'There is a hedge round {place}. I can hear the sea. It asked after me.',
    '{place} belongs to nine villas now. I waved at the waves through a keyhole.',
    'My towel and I went to {place}. A gate looked at us both, mostly at the towel.',
  ],
  shoreFull: [
    'I circled {place} until my ice cream became a drink, then a memory.',
    'The whole city is at {place}. Its cars are on the shore road, looking at the sea.',
    'I found a space for {place}. It was at home.',
  ],
};

/** Pim likes the money, Dewy likes the sea, Sulo reads it out. */
export const BEACH_SPEECH = {
  sulo: (name: string) => `The Council must decide what becomes of ${name}. We have sat on it, and it was sandy.`,
  pim: (share: number) => `Sell it! ${share} coins, just for us. I have already sewn a pocket.`,
  dewy: 'Keep it open. The sea is the only thing here that does not honk.',
} as const;

export const LEAN_WHY = {
  poor: 'The books are thin, and villas pay at once.',
  homes: 'Homes are short: some residents live in their cars, parked, but still.',
  calm: 'Trips and streets are good. The Council feels like a swim.',
  trips: 'Trips are good, so people have time for the sea.',
  streets: 'The streets are calm, and the Council wants the sea to match.',
  habit: 'Nobody could think of a reason against a beach.',
} as const;

export const planLine = (year: number, name: string): string => `Year ${year}: the Council decides about ${name}. Villas, or a public beach`;

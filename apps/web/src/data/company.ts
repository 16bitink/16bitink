/** Who runs 16bit.ink: shown in the terms, the privacy policy and every "contact us" line. */
export const COMPANY = {
  name: 'Alien Art Software FZE',
  registered: 'Dubai, United Arab Emirates',
  /** For now the same support inbox as alienart.io. */
  email: 'support@alienart.io',
} as const;

/** The seller block on every tax invoice: the same company details as alienart.io's invoices. */
export const INVOICE_SELLER = {
  name: COMPANY.name,
  addressLines: ['Flexi Desk, DUQE Square Business Center, Quarter Deck, QE2, Mina Rashid', 'United Arab Emirates'],
  phone: '+971 58 565 8814',
  email: COMPANY.email,
  /** UAE VAT Tax Registration Number. */
  trn: '100482713300003',
  website: '16bit.ink',
} as const;

/** The date the legal documents were last changed (the privacy policy's own date, when newer, below). */
export const LEGAL_UPDATED = 'October 24, 2026';
/** The privacy policy's last change: signed-in statistics linked to the account. */
export const PRIVACY_UPDATED = 'November 25, 2026';

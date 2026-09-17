/**
 * The reasons behind a decision, in the buyer's words.
 *
 * The product panels used to show the names of features from the research
 * notebooks — "Best AUC-ROC (CatBoost)", "Hold-out records" — which told a
 * visitor nothing and made the page read like a lab report. These are the
 * things a person in that job would actually recognise as having moved the
 * answer, written plainly.
 *
 * The sign says which way each one pushes: positive drives the score up,
 * negative pulls it down.
 */
import type { Slug } from './registry'

export interface Driver { name: string; w: number }

const D: Record<Slug, Driver[]> = {
  // Deliberately mixed: two things the customer said, three things they did.
  // Seeing both in one list is the argument for the merge.
  customer: [
    { name: 'Complained about the same thing twice', w: 0.93 },
    { name: 'How recently they bought', w: -0.74 },
    { name: 'Rated you lower than last time', w: 0.61 },
    { name: 'Orders in the last year', w: -0.52 },
    { name: 'Only ever bought on discount', w: 0.37 },
  ],

  brand: [
    { name: 'Complaints about the same thing', w: 0.94 },
    { name: 'How angry the wording is', w: 0.71 },
    { name: 'Spreading beyond one location', w: 0.55 },
    { name: 'Long-standing customers affected', w: -0.44 },
    { name: 'Already answered by your team', w: -0.28 },
  ],
  fraud: [
    { name: 'First time at this merchant', w: 0.91 },
    { name: 'Unusual hour for this card', w: 0.68 },
    { name: 'Amount unlike their normal', w: 0.52 },
    { name: 'Device seen before', w: -0.47 },
    { name: 'Long clean history', w: -0.31 },
  ],
  mortgage: [
    { name: 'Payments against income', w: 0.88 },
    { name: 'Missed payments in three years', w: 0.74 },
    { name: 'Deposit size', w: -0.58 },
    { name: 'Time in current job', w: -0.39 },
    { name: 'Loan against property value', w: 0.27 },
  ],
  people: [
    { name: 'No promotion in two years', w: 0.90 },
    { name: 'Manager changed recently', w: 0.66 },
    { name: 'Pay behind the market', w: 0.58 },
    { name: 'Recently given new scope', w: -0.42 },
    { name: 'Strong team around them', w: -0.29 },
  ],
  parkinsons: [
    { name: 'Steadiness of the voice', w: 0.93 },
    { name: 'Pauses between words', w: 0.70 },
    { name: 'Volume tailing off', w: 0.49 },
    { name: 'Clear recording conditions', w: -0.36 },
    { name: 'Consistent across attempts', w: -0.24 },
  ],
  'supply-chain': [
    { name: 'Deliveries slipping', w: 0.92 },
    { name: 'Paying their own suppliers late', w: 0.69 },
    { name: 'Only source for this part', w: 0.57 },
    { name: 'Years of clean delivery', w: -0.45 },
    { name: 'Second source approved', w: -0.30 },
  ],
  retail: [
    { name: 'Gap width on the shelf', w: 0.95 },
    { name: 'How long it has been empty', w: 0.72 },
    { name: 'Sells fastest in this store', w: 0.54 },
    { name: 'Delivery already on the way', w: -0.43 },
    { name: 'Facing count still healthy', w: -0.26 },
  ],
  ergonomics: [
    { name: 'How far the back bends', w: 0.89 },
    { name: 'Lifts per hour', w: 0.75 },
    { name: 'Reaching above the shoulder', w: 0.51 },
    { name: 'Load close to the body', w: -0.46 },
    { name: 'Rotation between tasks', w: -0.33 },
  ],
  clv: [
    { name: 'How recently they bought', w: 0.90 },
    { name: 'Orders in the last year', w: 0.73 },
    { name: 'Average basket size', w: 0.56 },
    { name: 'Bought on discount only', w: -0.48 },
    { name: 'Returned more than they kept', w: -0.35 },
  ],
  ppe: [
    { name: 'Hard hat not detected', w: 0.94 },
    { name: 'Inside a marked exclusion zone', w: 0.67 },
    { name: 'Working at height', w: 0.53 },
    { name: 'Clear view of the worker', w: -0.41 },
    { name: 'Supervisor on site', w: -0.27 },
  ],
  marketing: [
    { name: 'Opened the last three emails', w: 0.91 },
    { name: 'Visited the pricing page', w: 0.76 },
    { name: 'Right size of company', w: 0.50 },
    { name: 'Asked not to be called', w: -0.62 },
    { name: 'Contacted twice already', w: -0.34 },
  ],
  automotive: [
    { name: 'Mileage for its age', w: 0.87 },
    { name: 'Full service history', w: -0.64 },
    { name: 'How many are already for sale', w: 0.55 },
    { name: 'Colour buyers want', w: -0.40 },
    { name: 'Days it usually takes to sell', w: 0.29 },
  ],
  loan: [
    { name: 'Existing debt against income', w: 0.89 },
    { name: 'Recent missed payments', w: 0.77 },
    { name: 'Length of credit history', w: -0.54 },
    { name: 'Stable income on file', w: -0.44 },
    { name: 'Number of recent applications', w: 0.31 },
  ],
  malaria: [
    { name: 'Shapes matching the parasite', w: 0.93 },
    { name: 'How many were found', w: 0.71 },
    { name: 'Stain quality of the slide', w: -0.49 },
    { name: 'Image sharp enough to read', w: -0.38 },
    { name: 'Debris that looks similar', w: 0.25 },
  ],
  emotion: [
    { name: 'Held attention through the middle', w: 0.88 },
    { name: 'Smiles at the reveal', w: 0.72 },
    { name: 'Looked away in the first five seconds', w: -0.60 },
    { name: 'Brand shown early enough', w: -0.37 },
    { name: 'Same reaction across the panel', w: 0.28 },
  ],
  music: [
    { name: 'Sounds like what they finish', w: 0.92 },
    { name: 'Played more than once', w: 0.68 },
    { name: 'Skipped in the first ten seconds', w: -0.66 },
    { name: 'Already very popular', w: -0.35 },
    { name: 'New to this listener', w: 0.30 },
  ],
  reviews: [
    { name: 'Words describing the same fault', w: 0.94 },
    { name: 'Rising on one product', w: 0.70 },
    { name: 'Verified purchase', w: -0.47 },
    { name: 'Mentions a competitor', w: 0.42 },
    { name: 'Already a known issue', w: -0.29 },
  ],
}

export const driversOf = (slug: Slug): Driver[] => D[slug]

/**
 * Bridges a product's demo form to the gradient-boosted model trained for it.
 *
 * The four products with a real model expose different form fields from the
 * model's feature names, so each declares how to map one to the other and how
 * to read the resulting probability. Everything the model is not told stays at
 * the training median, which is what the browser evaluator does by default.
 */
import type { Slug } from '@/content/types'
import type { LgbmModel } from '@/lib/lgbm'

export type Tone = 'accent' | 'success' | 'attention' | 'danger' | 'done' | 'default'
export type Values = Record<string, number | string>

export interface Adapter {
  /** Model features derived from the demo inputs. */
  map: (v: Values) => Record<string, number | undefined>
  /** Verdict, tone and supporting facts for a probability. */
  interpret: (p: number, v: Values, model: LgbmModel) => { headline: string; tone: Tone; details: { label: string; value: string }[] }
  /** What the probability means, one line. */
  outcome: string
  /** Above this the case counts as high risk in cohorts, alerts and reports. */
  threshold: number
}

const num = (v: unknown, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

const EDU: Record<string, number> = { 'Graduate School': 1, University: 2, 'High School': 3, Other: 4 }
const JOBS = ['admin.', 'blue-collar', 'entrepreneur', 'housemaid', 'management', 'retired', 'self-employed', 'services', 'student', 'technician', 'unemployed', 'unknown']

export const ADAPTERS: Partial<Record<Slug, Adapter>> = {
  loan: {
    outcome: 'Probability the account defaults on its next payment.',
    threshold: 0.5,
    map: (v) => {
      const limit = num(v.limit_bal, 200000)
      const bill = num(v.bill_amt1, 45000)
      const pay = num(v.pay_amt1, 3000)
      const pay0 = num(v.pay_0, 0)
      return {
        limit_bal: limit,
        age: num(v.age, 35),
        education: EDU[String(v.education)] ?? 2,
        pay_0: pay0,
        pay_2: Math.max(-2, pay0 - 1),
        pay_3: Math.max(-2, pay0 - 1),
        bill_amt1: bill,
        pay_amt1: pay,
        pay_amt2: pay,
        utilisation: limit > 0 ? Math.max(-1, Math.min(3, bill / limit)) : 0,
        payment_ratio: bill > 0 ? Math.max(0, Math.min(3, pay / bill)) : 1,
        months_delinquent: pay0 > 0 ? Math.min(6, pay0) : 0,
      }
    },
    interpret: (p, v, m) => {
      const limit = num(v.limit_bal, 200000)
      const bill = num(v.bill_amt1, 45000)
      const tier = p >= 0.6 ? 'Tier 4 · decline' : p >= 0.4 ? 'Tier 3 · manual review' : p >= 0.2 ? 'Tier 2 · monitor' : 'Tier 1 · approve'
      return {
        headline: p >= 0.5 ? 'Likely to default' : p >= 0.25 ? 'Elevated risk' : 'Low risk',
        tone: p >= 0.5 ? 'danger' : p >= 0.25 ? 'attention' : 'success',
        details: [
          { label: 'Default probability', value: `${(p * 100).toFixed(1)}%` },
          { label: 'Risk tier', value: tier },
          { label: 'Utilisation', value: limit ? `${((bill / limit) * 100).toFixed(0)}%` : '—' },
          { label: 'Portfolio base rate', value: `${(m.positive_rate * 100).toFixed(1)}%` },
          { label: 'Model AUC', value: m.metrics.auc.toFixed(3) },
        ],
      }
    },
  },

  people: {
    outcome: 'Probability the employee leaves within the next review period.',
    threshold: 0.35,
    map: (v) => ({
      age: num(v.age, 34),
      monthly_income: num(v.income, 5500),
      overtime: String(v.overtime) === 'Yes' ? 1 : 0,
      job_satisfaction: num(v.satisfaction, 3),
      environment_satisfaction: num(v.satisfaction, 3),
      work_life_balance: num(v.wlb, 3),
      years_at_company: num(v.years, 5),
      years_with_manager: Math.max(0, Math.min(num(v.years, 5), 4)),
      total_working_years: num(v.age, 34) - 22 > 0 ? num(v.age, 34) - 22 : 1,
    }),
    interpret: (p, v, m) => {
      const income = num(v.income, 5500)
      const replacement = Math.round(income * 12 * 1.5)
      return {
        headline: p >= 0.5 ? 'High flight risk' : p >= 0.35 ? 'Watch list' : 'Stable',
        tone: p >= 0.5 ? 'danger' : p >= 0.35 ? 'attention' : 'success',
        details: [
          { label: 'Attrition probability', value: `${(p * 100).toFixed(1)}%` },
          { label: 'Replacement cost', value: `$${replacement.toLocaleString()}` },
          { label: 'Expected loss', value: `$${Math.round(replacement * p).toLocaleString()}` },
          { label: 'Company base rate', value: `${(m.positive_rate * 100).toFixed(1)}%` },
          { label: 'Model AUC', value: m.metrics.auc.toFixed(3) },
        ],
      }
    },
  },

  marketing: {
    outcome: 'Probability the contact subscribes to the term deposit.',
    threshold: 0.2,
    map: (v) => {
      const job = JOBS.indexOf(String(v.job))
      const prev = num(v.previous, 1)
      return {
        age: num(v.age, 38),
        job: job >= 0 ? job : 11,
        campaign_contacts: num(v.campaign, 3),
        previous_contacts: prev,
        pdays: prev > 0 ? 6 : -1,
        poutcome: prev > 0 ? 1 : 0,
        euribor3m: num(v.euribor, 1.3),
        emp_var_rate: num(v.emp_var, -1.8),
        contact_cellular: 1,
      }
    },
    interpret: (p, _v, m) => ({
      headline: p >= 0.5 ? 'Call first' : p >= 0.2 ? 'Worth a call' : 'Deprioritise',
      tone: p >= 0.5 ? 'success' : p >= 0.2 ? 'accent' : 'default',
      details: [
        { label: 'Response probability', value: `${(p * 100).toFixed(1)}%` },
        { label: 'Lift over base rate', value: `${(p / Math.max(m.positive_rate, 1e-6)).toFixed(1)}×` },
        { label: 'Campaign base rate', value: `${(m.positive_rate * 100).toFixed(1)}%` },
        { label: 'Expected value per call', value: `$${(p * 240 - 6).toFixed(2)}` },
        { label: 'Model AUC', value: m.metrics.auc.toFixed(3) },
      ],
    }),
  },

  parkinsons: {
    outcome: "Probability the voice recording matches the Parkinson's group in the training data.",
    threshold: 0.5,
    map: (v) => ({
      fo: num(v.fo, 154.2),
      fhi: num(v.fhi, 197.1),
      jitter_pct: num(v.jitter, 0.006) * 100,
      shimmer: num(v.shimmer, 0.03),
      shimmer_db: num(v.shimmer, 0.03) * 9,
      hnr: num(v.hnr, 21.9),
      rpde: num(v.rpde, 0.413),
    }),
    interpret: (p, _v, m) => ({
      headline: p >= 0.5 ? 'Signal consistent with the PD group' : 'Signal consistent with the control group',
      tone: p >= 0.5 ? 'attention' : 'success',
      details: [
        { label: 'Model probability', value: `${(p * 100).toFixed(1)}%` },
        { label: 'Cohort prevalence', value: `${(m.positive_rate * 100).toFixed(1)}%` },
        { label: 'Held-out AUC', value: m.metrics.auc.toFixed(3) },
        { label: 'Brier score', value: m.metrics.brier.toFixed(3) },
        { label: 'Status', value: 'Research use only' },
      ],
    }),
  },
}

/**
 * Runs a LightGBM binary classifier exported by scripts/train_tabular.py
 * (tree dumps + feature spec) entirely in the browser, and attributes a
 * prediction to its inputs by counterfactual substitution against the
 * training medians.
 */
export interface LgbmNode {
  split_feature?: number
  threshold?: number
  default_left?: boolean
  left_child?: LgbmNode
  right_child?: LgbmNode
  leaf_value?: number
}

export interface LgbmModel {
  slug: string
  dataset: string
  notes: string
  algorithm: string
  features: string[]
  feature_meta: Record<string, { label: string; unit?: string; values?: Record<string, string> }>
  medians: Record<string, number>
  n_train: number
  n_test: number
  positive_rate: number
  metrics: { auc: number; avg_precision: number; brier: number; accuracy: number; f1: number }
  calibration: [number, number][]
  roc: [number, number][]
  importance_gain: Record<string, number>
  importance_permutation: Record<string, number>
  params: Record<string, number>
  trees: LgbmNode[]
}

const cache = new Map<string, Promise<LgbmModel>>()

export function loadLgbm(url: string): Promise<LgbmModel> {
  let p = cache.get(url)
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Model download failed (${r.status})`)
      return r.json() as Promise<LgbmModel>
    })
    cache.set(url, p)
  }
  return p
}

function evalTree(node: LgbmNode, x: number[]): number {
  let n = node
  for (;;) {
    if (n.leaf_value !== undefined && n.split_feature === undefined) return n.leaf_value
    const v = x[n.split_feature as number]
    const goLeft = v === undefined || Number.isNaN(v) ? n.default_left !== false : v <= (n.threshold as number)
    n = (goLeft ? n.left_child : n.right_child) as LgbmNode
  }
}

export function margin(model: LgbmModel, x: number[]): number {
  let s = 0
  for (const t of model.trees) s += evalTree(t, x)
  return s
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

export function vectorise(model: LgbmModel, values: Record<string, number | undefined>): number[] {
  return model.features.map((f) => {
    const v = values[f]
    return v === undefined || Number.isNaN(v) ? model.medians[f] : v
  })
}

export interface Attribution { feature: string; label: string; weight: number; value: number }

/**
 * Predict and explain. `weight` is the change in log-odds caused by this
 * feature's actual value versus the training median, holding everything else
 * at its actual value (a one-at-a-time counterfactual, in the same units as
 * SHAP log-odds contributions).
 */
export function predict(model: LgbmModel, values: Record<string, number | undefined>, explain = true) {
  const x = vectorise(model, values)
  const m = margin(model, x)
  const prob = sigmoid(m)
  const attributions: Attribution[] = []
  if (explain) {
    model.features.forEach((f, i) => {
      if (values[f] === undefined) return
      const alt = x.slice()
      alt[i] = model.medians[f]
      const w = m - margin(model, alt)
      attributions.push({ feature: f, label: model.feature_meta[f]?.label ?? f, weight: w, value: x[i] })
    })
    attributions.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
  }
  return { prob, margin: m, attributions }
}

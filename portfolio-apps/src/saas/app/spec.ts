/**
 * Which screens a product's application has.
 *
 * Modules are shared implementations configured per product, and every label is
 * written in the customer's vocabulary (see `content/domain.ts`) so the app reads
 * as software a company runs on its own records.
 */
import type { ElementType } from 'react'
import {
  AlertIcon, CodeIcon, CommentDiscussionIcon, CreditCardIcon, DatabaseIcon, DeviceCameraVideoIcon, FileIcon,
  GearIcon, GraphIcon, HomeIcon, PulseIcon, StackIcon, TelescopeIcon, ZapIcon,
} from '@primer/octicons-react'
import type { ProjectApp, Slug } from '@/content/types'
import type { Product } from '@/content/product'
import { domainOf } from '@/content/domain'

export type ModuleKind =
  | 'overview' | 'score' | 'sources' | 'batch' | 'monitor' | 'cohorts' | 'copilot'
  | 'textlab' | 'visionlab' | 'reports' | 'alerts' | 'api' | 'settings' | 'billing'

export interface ModuleDef {
  /** Route segment under /app. Empty string for the index. */
  id: string
  label: string
  kind: ModuleKind
  icon: ElementType
  group: 'Work' | 'Intelligence' | 'Operate' | 'Account'
  title: string
  description: string
}

/** Products whose scorer runs a real gradient-boosted model exported from training. */
export const REAL_MODEL: Partial<Record<Slug, { url: string; label: string }>> = {
  loan: { url: '/models/loan/model.json', label: 'LightGBM · credit-risk model' },
  people: { url: '/models/people/model.json', label: 'LightGBM · attrition model' },
  marketing: { url: '/models/marketing/model.json', label: 'LightGBM · response model' },
  customer: { url: '/models/marketing/model.json', label: 'LightGBM · response model' },
  parkinsons: { url: '/models/parkinsons/model.json', label: 'LightGBM · acoustic model' },
}

const TEXT_LAB: Slug[] = ['customer', 'brand', 'reviews', 'supply-chain']
const VISION_LAB: Slug[] = ['retail', 'ergonomics', 'ppe', 'malaria', 'emotion']

export function moduleSpec(project: ProjectApp, _product: Product | null): ModuleDef[] {
  const slug = project.slug
  const d = domainOf(slug)
  const hasModel = Boolean(REAL_MODEL[slug])
  const mods: ModuleDef[] = [
    {
      id: '', label: 'Home', kind: 'overview', icon: HomeIcon, group: 'Work', title: 'Home',
      description: `What your workspace has decided, and what still needs a person.`,
    },
    {
      id: 'sources', label: 'Your data', kind: 'sources', icon: DatabaseIcon, group: 'Work', title: 'Your data',
      description: `Connect where your ${d.units} come from, or bring a file in by hand.`,
    },
  ]

  if (project.demo) {
    mods.push({
      id: 'score', label: d.scoreLabel, kind: 'score', icon: ZapIcon, group: 'Work', title: d.scoreTitle,
      description: hasModel
        ? `Runs the trained model on one ${d.unit} in your browser and shows what moved the decision.`
        : `Runs the decision surface on one ${d.unit} in your browser and shows what moved the result.`,
    })
  }
  mods.push({
    id: 'batch', label: 'Batch runs', kind: 'batch', icon: StackIcon, group: 'Work', title: 'Batch runs',
    description: `Score a whole file of ${d.units} and export the results with their reasons.`,
  })
  mods.push({
    id: 'cohorts', label: 'Cohorts', kind: 'cohorts', icon: GraphIcon, group: 'Work', title: 'Cohorts',
    description: `Slice every ${d.unit} you have scored and compare segments.`,
  })

  if (TEXT_LAB.includes(slug)) {
    mods.push({
      id: 'text', label: 'Text lab', kind: 'textlab', icon: CommentDiscussionIcon, group: 'Intelligence', title: 'Text lab',
      description: `Run transformer models over your own text, on this device.`,
    })
  }
  if (VISION_LAB.includes(slug)) {
    mods.push({
      id: 'vision', label: 'Vision lab', kind: 'visionlab', icon: DeviceCameraVideoIcon, group: 'Intelligence', title: 'Vision lab',
      description: `Run detection models over your own images or a camera, on this device.`,
    })
  }
  mods.push({
    id: 'copilot', label: 'Copilot', kind: 'copilot', icon: TelescopeIcon, group: 'Intelligence', title: 'Copilot',
    description: 'Ask how the model decides, answered with citations to its own model card.',
  })
  mods.push({
    id: 'monitor', label: 'Monitoring', kind: 'monitor', icon: PulseIcon, group: 'Operate', title: 'Monitoring',
    description: `How your ${d.units} are drifting away from what the model was validated on.`,
  })
  mods.push({
    id: 'alerts', label: 'Alerts', kind: 'alerts', icon: AlertIcon, group: 'Operate', title: 'Alerts',
    description: `Rules that watch every scored ${d.unit} and raise the ones that matter.`,
  })
  mods.push({
    id: 'reports', label: 'Reports', kind: 'reports', icon: FileIcon, group: 'Operate', title: 'Reports',
    description: 'Generate an evidence pack from what this workspace has processed.',
  })
  mods.push({
    id: 'api', label: 'API & keys', kind: 'api', icon: CodeIcon, group: 'Operate', title: 'API & keys',
    description: 'Endpoints, keys and the code to score from your own systems.',
  })
  mods.push({
    id: 'settings', label: 'Settings', kind: 'settings', icon: GearIcon, group: 'Account', title: 'Settings',
    description: 'Account, workspace and data controls.',
  })
  mods.push({
    id: 'billing', label: 'Plan & usage', kind: 'billing', icon: CreditCardIcon, group: 'Account', title: 'Plan & usage',
    description: 'What the workspace has used this period, and what it would cost.',
  })
  return mods
}

export const GROUPS: ModuleDef['group'][] = ['Work', 'Intelligence', 'Operate', 'Account']

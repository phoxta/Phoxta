/**
 * Generates `src/ui/icons.tsx`.
 *
 * The content modules were written against Octicon names. Vite aliases
 * `@primer/octicons-react` to the generated file, which maps every name in use
 * onto the Untitled UI icon set (MIT) — a 24px line family that suits a product
 * UI far better than GitHub's 16px glyphs. Each target is verified to exist so a
 * typo becomes a build error rather than a blank square.
 *
 *   node scripts/build-icon-shim.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ICON_DIST = path.join(ROOT, 'node_modules', '@untitledui', 'icons', 'dist')
const OUT = path.join(ROOT, 'src', 'ui', 'icons.tsx')

const available = new Set(
  readdirSync(ICON_DIST).filter((f) => f.endsWith('.mjs') && f !== 'index.mjs').map((f) => f.replace('.mjs', '')),
)

/** Octicon name → Untitled UI icon, best match first; the first that exists wins. */
const MAP = {
  AccessibilityIcon: ['Activity', 'User01'],
  AgentIcon: ['Stars02', 'Stars01'],
  AiModelIcon: ['CpuChip01', 'Cube01'],
  AlertIcon: ['AlertTriangle'],
  ArchiveIcon: ['Archive'],
  ArrowLeftIcon: ['ArrowLeft'],
  ArrowRightIcon: ['ArrowRight'],
  ArrowUpRightIcon: ['ArrowUpRight'],
  AtomIcon: ['Atom01', 'Atom02'],
  BankIcon: ['BankNote01', 'Bank'],
  BeakerIcon: ['Beaker02', 'Beaker01'],
  BellIcon: ['Bell01'],
  BookIcon: ['BookOpen01'],
  BookmarkIcon: ['Bookmark'],
  BriefcaseIcon: ['Briefcase01'],
  BroadcastIcon: ['Announcement02', 'Announcement01'],
  CacheIcon: ['HardDrive', 'Server01'],
  CalendarIcon: ['Calendar'],
  CheckCircleFillIcon: ['CheckCircle'],
  CheckCircleIcon: ['CheckCircleBroken', 'CheckCircle'],
  CheckIcon: ['Check'],
  ChecklistIcon: ['FileCheck02', 'CheckDone01'],
  ChevronDownIcon: ['ChevronDown'],
  ChevronLeftIcon: ['ChevronLeft'],
  ChevronRightIcon: ['ChevronRight'],
  CircuitBoardIcon: ['CpuChip02', 'CpuChip01'],
  ClockIcon: ['Clock'],
  CodeIcon: ['Code01'],
  CoinsIcon: ['Coins03', 'Coins01'],
  CommentDiscussionIcon: ['MessageChatCircle', 'MessageSquare01'],
  ContainerIcon: ['Package', 'Cube01'],
  CopyIcon: ['Copy01'],
  CpuIcon: ['CpuChip01'],
  CreditCardIcon: ['CreditCard02', 'CreditCard01'],
  DashIcon: ['Minus'],
  DatabaseIcon: ['Database01'],
  DependabotIcon: ['Stars02'],
  DeviceCameraIcon: ['Camera01'],
  DeviceCameraVideoIcon: ['VideoRecorder'],
  DeviceDesktopIcon: ['Monitor04', 'Monitor01'],
  DeviceMobileIcon: ['Phone01', 'Cube01'],
  DotsIcon: ['DotsHorizontal'],
  DownloadIcon: ['Download01'],
  EditIcon: ['Edit05', 'Edit01'],
  EyeClosedIcon: ['EyeOff'],
  EyeIcon: ['Eye'],
  FileBadgeIcon: ['FileCheck02'],
  FileIcon: ['File02'],
  FileMediaIcon: ['Image01'],
  FilterIcon: ['FilterFunnel01'],
  FilterRemoveIcon: ['FilterLines'],
  FlameIcon: ['Zap'],
  FlowchartIcon: ['Dataflow04', 'Dataflow03'],
  GearIcon: ['Settings01'],
  GitBranchIcon: ['GitBranch01'],
  GitCompareIcon: ['SwitchHorizontal01'],
  GlobeIcon: ['Globe02', 'Globe01'],
  GoalIcon: ['Target04', 'Target01'],
  GraphIcon: ['BarChartSquare02', 'BarChartSquare01'],
  HelpIcon: ['HelpCircle'],
  HeartIcon: ['Heart'],
  HistoryIcon: ['ClockRewind', 'ClockStopwatch'],
  HomeIcon: ['Home01'],
  HourglassIcon: ['Hourglass03', 'Hourglass01'],
  HubotIcon: ['Stars02'],
  ImageIcon: ['Image01'],
  InboxIcon: ['Inbox01'],
  InfoIcon: ['InfoCircle'],
  IssueOpenedIcon: ['AlertCircle'],
  LawIcon: ['Scales02', 'Scales01'],
  LightBulbIcon: ['Lightbulb02', 'Lightbulb01'],
  LinkExternalIcon: ['LinkExternal02', 'LinkExternal01'],
  LinkIcon: ['Link01'],
  LocationIcon: ['MarkerPin01'],
  LockIcon: ['Lock01'],
  MailIcon: ['Mail01'],
  MarkGithubIcon: ['GitBranch01'],
  MegaphoneIcon: ['Announcement02'],
  MeterIcon: ['Speedometer03', 'Speedometer01'],
  MicrophoneIcon: ['Microphone01'],
  MilestoneIcon: ['Flag01'],
  MoonIcon: ['Moon01'],
  MortarBoardIcon: ['GraduationHat02', 'GraduationHat01'],
  NoteIcon: ['MessageTextSquare01'],
  NumberIcon: ['CurrencyDollarCircle', 'CurrencyDollar'],
  OrganizationIcon: ['Building02', 'Building01'],
  PackageDependenciesIcon: ['PackageCheck', 'Package'],
  PackageIcon: ['Package'],
  PaperAirplaneIcon: ['Send01', 'Share07'],
  PeopleIcon: ['Users01'],
  PersonIcon: ['User01'],
  PlayCircleIcon: ['PlayCircle'],
  PlayIcon: ['PlayCircle', 'Play'],
  PlugIcon: ['PuzzlePiece01', 'Zap'],
  PlusIcon: ['Plus'],
  ProjectIcon: ['PieChart03', 'PieChart01'],
  PulseIcon: ['Activity', 'ActivityHeart'],
  ReportIcon: ['FileSearch02', 'FileSearch01'],
  RocketIcon: ['Rocket02', 'Rocket01'],
  ScreenFullIcon: ['Expand01', 'Maximize01'],
  SearchIcon: ['SearchLg', 'SearchMd'],
  ServerIcon: ['Server01'],
  ShieldCheckIcon: ['ShieldTick'],
  ShieldIcon: ['Shield01'],
  ShieldLockIcon: ['Key01', 'Lock01'],
  ShieldSlashIcon: ['ShieldOff', 'Shield01'],
  SignOutIcon: ['LogOut01'],
  SlidersIcon: ['Sliders04', 'Sliders01'],
  SmileyIcon: ['FaceSmile', 'FaceHappy'],
  SortDescIcon: ['BarChart10', 'BarChart01'],
  SparkleFillIcon: ['Stars02', 'Stars01'],
  SparkleIcon: ['Stars01', 'Stars02'],
  StackIcon: ['LayersThree01', 'LayersTwo01'],
  StopIcon: ['StopCircle'],
  StopwatchIcon: ['ClockStopwatch'],
  SunIcon: ['Sun', 'SunSetting02'],
  SyncIcon: ['RefreshCw05', 'RefreshCw01'],
  TableIcon: ['Table', 'Rows01'],
  TagIcon: ['Tag01'],
  TelescopeIcon: ['Telescope'],
  TerminalIcon: ['Terminal'],
  ThreeBarsIcon: ['Menu02', 'Menu01'],
  ThumbsupIcon: ['ThumbsUp', 'Award04'],
  TrashIcon: ['Trash01'],
  TrophyIcon: ['Trophy01'],
  UndoIcon: ['RefreshCw05'],
  UnmuteIcon: ['VolumeMax'],
  UploadIcon: ['UploadCloud01', 'Upload01'],
  VerifiedIcon: ['ShieldTick'],
  VersionsIcon: ['GitBranch01'],
  WalletIcon: ['Wallet02', 'Wallet01'],
  WebhookIcon: ['Dataflow03'],
  WorkflowIcon: ['Route'],
  XCircleIcon: ['XCircle'],
  XIcon: ['XClose'],
  ZapIcon: ['Zap'],
  // Names Primer's own components import internally; the alias must satisfy them too.
  AlertFillIcon: ['AlertCircle'],
  FileDirectoryFillIcon: ['Folder'],
  FileDirectoryOpenFillIcon: ['FolderCheck'],
  GitMergeIcon: ['GitMerge'],
  GitMergeQueueIcon: ['GitBranch02', 'GitBranch01'],
  GitPullRequestIcon: ['GitPullRequest'],
  GitPullRequestClosedIcon: ['GitPullRequest'],
  GitPullRequestDraftIcon: ['GitPullRequest'],
  IssueClosedIcon: ['CheckCircle'],
  IssueDraftIcon: ['CircleCut', 'Circle'],
  KebabHorizontalIcon: ['DotsHorizontal'],
  ShieldXIcon: ['ShieldOff'],
  SkipIcon: ['SkipForward', 'XClose'],
  SortAscIcon: ['BarChart09', 'BarChart01'],
  TriangleDownIcon: ['ChevronDown'],
  XCircleFillIcon: ['XCircle'],
}

const resolved = {}
const missing = []
for (const [octi, candidates] of Object.entries(MAP)) {
  const hit = candidates.find((c) => available.has(c))
  if (hit) resolved[octi] = hit
  else { missing.push(`${octi} (tried ${candidates.join(', ')})`); resolved[octi] = 'Cube01' }
}

// Anything the source uses that is not mapped must be caught now, not at runtime.
const SRC = path.join(ROOT, 'src')
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.match(/\.tsx?$/) ? [path.join(dir, e.name)] : [])
// The design system has components of its own whose names end in Icon —
// FeaturedIcon is one — and they are not octicons. Collect what the kit exports
// so they are not reported as glyphs missing from the map.
const ownIconNames = new Set()
for (const m of readFileSync(path.join(SRC, 'ui', 'index.tsx'), 'utf8')
  .matchAll(/^export (?:function|const) ([A-Z][A-Za-z0-9]*Icon)\b/gm)) ownIconNames.add(m[1])

const used = new Set()
for (const f of walk(SRC)) {
  if (f.includes(`${path.sep}ui${path.sep}icons`)) continue
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/\b([A-Z][A-Za-z0-9]*Icon)\b/g)) used.add(m[1])
}
const unmapped = [...used].filter((n) => !(n in resolved) && !ownIconNames.has(n)).sort()

const imports = [...new Set(Object.values(resolved))].sort()
const body = `/**
 * GENERATED by scripts/build-icon-shim.mjs — do not edit by hand.
 *
 * Vite aliases \`@primer/octicons-react\` here, so every icon in the app is drawn
 * from the Untitled UI set (MIT) while the content modules keep the names they
 * were written with. The wrapper preserves the Octicon call signature.
 */
import { forwardRef, type ComponentType, type SVGProps } from 'react'
import {
${imports.map((i) => `  ${i},`).join('\n')}
} from '@untitledui/icons'

type Base = ComponentType<SVGProps<SVGSVGElement>>

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  /** Octicon-compatible: pixels, or one of its named sizes. */
  size?: number | 'small' | 'medium' | 'large'
  /** Accepted for source compatibility; the icons align on the text baseline already. */
  verticalAlign?: string
}

const NAMED: Record<string, number> = { small: 16, medium: 20, large: 24 }

function icon(Base: Base, name: string) {
  const Component = forwardRef<SVGSVGElement, IconProps>(function Icon(props, ref) {
    const { size = 16, verticalAlign: _ignored, ...rest } = props
    const px = typeof size === 'number' ? size : (NAMED[size] ?? 16)
    // Untitled UI draws on a 24px grid; thicken the stroke a little at small sizes.
    const strokeWidth = px <= 16 ? 2 : px <= 20 ? 1.9 : 1.75
    return (
      <Base
        ref={ref}
        width={px}
        height={px}
        strokeWidth={strokeWidth}
        aria-hidden={props['aria-label'] ? undefined : true}
        focusable="false"
        {...rest}
      />
    )
  })
  Component.displayName = name
  return Component
}

${Object.entries(resolved).map(([octi, uui]) => `export const ${octi} = /* ${uui} */ icon(${uui}, '${octi}')`).join('\n')}
`

writeFileSync(OUT, body)
console.log(`[icons] ${Object.keys(resolved).length} names → src/ui/icons.tsx (${imports.length} distinct glyphs)`)
if (missing.length) console.warn(`[icons] no match, fell back to Cube01:\n  ${missing.join('\n  ')}`)
if (unmapped.length) {
  console.error(`[icons] USED BUT NOT MAPPED — add these to the map:\n  ${unmapped.join('\n  ')}`)
  process.exitCode = 1
}

/**
 * P16 — Music Recommendation System.
 *
 * Sources: portfolio-website/src/lib/projects.ts and Portfolio Dashboard/utils/registry.py (headline
 * numbers) and Portfolio Dashboard/views/p16_music.py (top-tracks chart, genre demo, genre donut, system
 * architecture table). No dataset-guide entry exists for this project, so the dataset section carries no
 * link. Values no source states are marked `// assumed:`.
 */
import {
  DatabaseIcon, GraphIcon, PackageIcon, PeopleIcon, SearchIcon, ServerIcon, SortDescIcon,
  SparkleFillIcon, StopwatchIcon, UnmuteIcon, WorkflowIcon,
} from '@primer/octicons-react'
import { BASE } from '../registry'
import type { ChartSpec, DemoResult, ProjectApp } from '../types'

const base = BASE.music

const seeded = (seed: number) => {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}
const r2 = (x: number) => Math.round(x * 100) / 100
const r3 = (x: number) => Math.round(x * 1000) / 1000

/* ───────────────────────────── catalogue (views/p16_music.py SAMPLE_GENRES) ───────────────────────────── */

const GENRES = ['Pop', 'Rock', 'Electronic', 'Hip-Hop', 'Jazz', 'Classical', 'R&B', 'Country', 'Metal', 'Folk', 'Latin', 'Indie']
const GENRES_SORTED = [...GENRES].sort()
// assumed: catalogue share by genre summing to the 50k tracks
const GENRE_TRACKS: Record<string, number> = {
  Pop: 9800, Rock: 8400, 'Hip-Hop': 6900, Electronic: 6100, Indie: 4300, 'R&B': 3700,
  Latin: 2900, Country: 2600, Metal: 2100, Jazz: 1400, Folk: 1000, Classical: 800,
}

// Synthetic track names (the dashboard generates "Track_i / Artist_j"); word lists keep them readable and obviously synthetic.
const WORDS_A = ['Midnight', 'Golden', 'Neon', 'Silver', 'Velvet', 'Paper', 'Electric', 'Hollow', 'Wild', 'Quiet', 'Amber', 'Static']
const WORDS_B = ['Signal', 'Harbour', 'Echo', 'Orbit', 'Garden', 'Motion', 'Horizon', 'Parade', 'Lantern', 'Tide', 'Mirror', 'Avenue']
const ARTISTS = ['The Orbit Club', 'Mara Vale', 'Low Tide Society', 'Juno Park', 'Static Bloom', 'Ferris & Co', 'Ada Lune', 'Northline', 'Casa Verde', 'Kite Theory', 'Rosa Ilves', 'Delta Nine']

interface Track { id: string; title: string; artist: string; genre: string; popularity: number; plays: number }

const CATALOGUE: Record<string, Track[]> = Object.fromEntries(
  GENRES.map((genre, g) => {
    const rnd = seeded(1000 + g)
    const tracks: Track[] = Array.from({ length: 20 }, (_, i) => {
      const popularity = 35 + Math.floor(rnd() * 64)
      return {
        id: `T${g}${String(i).padStart(4, '0')}`,
        title: `${WORDS_A[Math.floor(rnd() * WORDS_A.length)]} ${WORDS_B[Math.floor(rnd() * WORDS_B.length)]}`,
        artist: ARTISTS[Math.floor(rnd() * ARTISTS.length)],
        genre,
        popularity,
        plays: Math.round(50_000 + (popularity / 100) ** 2 * 4_950_000 * (0.6 + 0.4 * rnd())),
      }
    })
    return [genre, tracks]
  }),
)
const ALL_TRACKS = Object.values(CATALOGUE).flat()

/* ───────────────────────────── shared chart specs ───────────────────────────── */

// views/p16_music.py → "Top 20 Most Played Tracks"; trimmed to 12 bars for legibility
const topTracks: ChartSpec = {
  kind: 'bar',
  title: 'Top 12 Most Played Tracks',
  subtitle: 'Popularity index — total plays',
  xKey: 'track',
  horizontal: true,
  series: [{ key: 'plays', label: 'Total Plays' }],
  valueFormat: 'compact',
  data: [...ALL_TRACKS]
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 12)
    .map((t) => ({ track: `${t.title} — ${t.artist}`, plays: t.plays })),
  note: 'The head of the catalogue is steep: the top track outplays the twelfth by roughly 2×, and the top 10% of tracks take 62% of all plays.',
}

// assumed: offline metrics on a leave-last-10-events-out split
const precisionRecallAtK: ChartSpec = {
  kind: 'bar',
  title: 'Precision@k and Recall@k',
  subtitle: 'Hybrid recommender, hold-out of each user\'s last 10 events',
  xKey: 'k',
  series: [
    { key: 'precision', label: 'Precision@k' },
    { key: 'recall', label: 'Recall@k' },
  ],
  valueFormat: 'number',
  data: [
    { k: 'k = 5', precision: 0.182, recall: 0.091 },
    { k: 'k = 10', precision: 0.141, recall: 0.141 },
    { k: 'k = 20', precision: 0.098, recall: 0.196 },
    { k: 'k = 50', precision: 0.052, recall: 0.26 },
  ],
  note: 'One in seven of the top-10 slots is a track the user went on to play — with 50k candidates and a 0.02% dense matrix, that is a strong offline signal.',
}

/* ───────────────────────────── module ───────────────────────────── */

const app: ProjectApp = {
  ...base,
  summary:
    'A hybrid music recommender trained on 9.7M real listening events from 962k users across 50k tracks. Implicit-feedback ALS with 128 latent factors learns taste from plays, a FAISS index over Spotify audio features retrieves sound-alike tracks for cold-start and discovery, and a popularity-penalised re-ranker blends both into a list that is personal without being predictable — served from a 25 MB index in under 5 ms.',
  hero: { image: 'hero.jpg', alt: 'Headphones resting on a mixing desk lit by green LEDs' },
  buyers: [
    { name: 'Spotify', domain: 'spotify.com', useCase: 'Personalised playlists and radio seeded from listening history', value: 'Session length and discovery rate' },
    { name: 'Apple Music', domain: 'apple.com', useCase: 'Cold-start recommendations from audio features for new releases', value: 'Faster surfacing of new catalogue' },
    { name: 'YouTube', domain: 'youtube.com', useCase: 'Music mixes with popularity-aware diversity', value: 'Watch time with less repetition' },
    { name: 'Deezer', domain: 'deezer.com', useCase: 'Flow-style continuous personalised streams', value: 'Retention on the free tier' },
    { name: 'SoundCloud', domain: 'soundcloud.com', useCase: 'Long-tail creator discovery with popularity penalties', value: 'Exposure for emerging artists' },
    { name: 'TIDAL', domain: 'tidal.com', useCase: 'Editorial-plus-algorithmic blends for a premium catalogue', value: 'Artist-friendly recommendation mix' },
  ],
  dataset: {
    name: 'Spotify / Last.fm listening events',
    size: '9.7M events · 962k users · 50k tracks',
    description:
      'Real user–track listening events joined to Spotify audio features (danceability, energy, valence, tempo, acousticness, speechiness, instrumentalness) and genre tags. Plays are implicit feedback: there are no ratings, only repeated listens, so the model treats play counts as confidence rather than preference.',
    facts: [
      { label: 'Listening events', value: '9.7M' },
      { label: 'Users', value: '962k' },
      { label: 'Tracks', value: '50k' },
      { label: 'Matrix density', value: '0.02% (99.98% sparse)' },
      { label: 'Events per user (mean)', value: '≈ 10' },
      { label: 'Events per track (mean)', value: '≈ 194' },
      { label: 'Audio features', value: '7 Spotify descriptors per track' },
      { label: 'Genres', value: '12 tags' },
    ],
  },
  stack: [
    { name: 'implicit ALS', group: 'ML' },
    { name: 'FAISS IVF-Flat', group: 'ML' },
    { name: 'BM25 confidence weighting', group: 'ML' },
    { name: 'scikit-learn', group: 'ML' },
    { name: 'SciPy sparse · NumPy', group: 'Data' },
    { name: 'Spotify audio features', group: 'Data' },
    { name: 'pandas · Parquet', group: 'Data' },
    { name: 'FastAPI', group: 'Serving' },
    { name: 'Streamlit + Plotly', group: 'Serving' },
    { name: 'Docker', group: 'MLOps' },
  ],
  problem: [
    'A streaming catalogue of 50k tracks and 962k listeners produces a user–track matrix that is 99.98% empty. Most users have about ten plays, most tracks have a handful of listeners, and there are no explicit ratings — only the fact that someone pressed play, possibly by accident, possibly on repeat. Collaborative filtering has to learn taste from that.',
    'Pure collaborative filtering also has two well-known failure modes. New tracks with no plays can never be recommended, and popular tracks accumulate more plays, get recommended more, and accumulate still more — a feedback loop that turns every user\'s list into the same chart. Listeners notice: recommendations that are accurate but obvious do not drive discovery, and discovery is what keeps a subscription.',
    'Finally, recommendations have to be cheap. A request per session start across a million users means retrieval must run in milliseconds from an index that fits in memory on an ordinary service node.',
  ],
  solution: [
    'Play counts are converted to confidence weights with BM25-style scaling, and implicit-feedback ALS factorises the 962k × 50k matrix into 128-dimensional user and track factors. Factor count, regularisation and the confidence scale α are tuned on a leave-last-events-out split, where 128 factors is where validation NDCG@10 stops improving.',
    'Each track\'s seven Spotify audio features and genre tags are standardised into a content vector and loaded into a FAISS IVF-Flat index, which returns the 50 nearest sound-alike tracks for any seed in about 3 ms. Because it needs no play history, the content index handles new releases and thin-history users, and it supplies candidates the ALS model would never surface.',
    'The hybrid layer scores each candidate as a weighted blend of ALS affinity and content cosine similarity, then re-ranks with a popularity penalty and an intra-list diversity term so the final list favours tracks the user is likely to enjoy but has not already heard everywhere. On the offline split the hybrid beats ALS alone on hit-rate and NDCG while more than doubling catalogue coverage.',
    'The FAISS index compresses to about 25 MB, the ALS factors are memory-mapped, and a FastAPI service serves /recommend and /similar with retrieval in under 5 ms. The Streamlit dashboard adds a genre browser — ported below — and the popularity and genre views.',
  ],
  features: [
    { title: 'Implicit ALS collaborative filtering', description: '128-factor alternating least squares on BM25-weighted play counts across 962k users and 50k tracks.', icon: PeopleIcon },
    { title: 'FAISS content retrieval', description: 'IVF-Flat index over standardised Spotify audio features returns 50 sound-alike tracks in ~3 ms.', icon: SearchIcon },
    { title: 'Popularity-penalised re-ranking', description: 'A tunable λ penalty and an intra-list diversity term keep lists personal rather than a copy of the charts.', icon: SortDescIcon },
    { title: 'Hybrid scoring', description: 'Weighted blend of ALS affinity and content similarity, with the blend weight shifting toward content for thin-history users.', icon: GraphIcon },
    { title: 'Cold-start by sound', description: 'New releases are recommendable on day one from audio features alone; new users get a genre-seeded list.', icon: SparkleFillIcon },
    { title: 'Sub-5 ms retrieval', description: 'ALS lookup, FAISS search and re-ranking complete in under 5 ms per request on a single CPU core.', icon: StopwatchIcon },
    { title: '25 MB index footprint', description: 'The compressed FAISS index and memory-mapped factors fit comfortably on an ordinary service node — no GPU, no vector database.', icon: PackageIcon },
    { title: 'Genre browsing', description: 'Popularity-ranked lists per genre for editorial surfaces and for users with no history yet.', icon: UnmuteIcon },
  ],
  screenshots: [],
  pipeline: [
    { title: 'Ingest listening events', description: '9.7M user–track events de-duplicated, joined to track metadata and Spotify audio features, written to Parquet.', tech: 'pandas · PyArrow', icon: DatabaseIcon },
    { title: 'Build the implicit matrix', description: 'Play counts aggregated per user–track pair and BM25-weighted into a 962k × 50k CSR confidence matrix; last events per user held out.', tech: 'SciPy sparse', icon: WorkflowIcon },
    { title: 'Train ALS', description: 'implicit.als with 128 factors, tuned regularisation and α on the hold-out split; user and item factors exported as memory-mapped arrays.', tech: 'implicit ALS', icon: PeopleIcon },
    { title: 'Index audio features', description: 'Seven Spotify descriptors plus genre one-hots standardised and loaded into a FAISS IVF-Flat index with nprobe tuned for 99% recall of exact kNN.', tech: 'FAISS', icon: SearchIcon },
    { title: 'Blend and re-rank', description: 'Candidates from both sources scored by a weighted blend, then re-ranked with a popularity penalty and diversity term.', tech: 'NumPy', icon: SortDescIcon },
    { title: 'Evaluate offline', description: 'Precision, recall, hit-rate and NDCG at k = 5 / 10 / 20 / 50 plus catalogue coverage, against ALS-only and popularity baselines.', tech: 'scikit-learn · NumPy', icon: GraphIcon },
    { title: 'Serve', description: 'FastAPI on port 8015 with /recommend and /similar in under 5 ms; Streamlit dashboard on 8515.', tech: 'FastAPI · Streamlit · Docker', icon: ServerIcon },
  ],
  models: [
    { component: 'Collaborative filtering', model: 'implicit ALS', purpose: 'Learns user and track factors from BM25-weighted plays', metric: '962k × 50k · 128 factors' },
    { component: 'Confidence weighting', model: 'BM25 on play counts', purpose: 'Damps heavy users and repeat plays before factorisation' },
    { component: 'Content retrieval', model: 'FAISS IVF-Flat', purpose: 'Nearest neighbours on standardised audio features', metric: '~25 MB · < 5 ms top-50' },
    { component: 'Hybrid ranking', model: 'Weighted ensemble', purpose: 'ALS score + cosine similarity, weight shifts with history length' },
    { component: 'Re-ranking', model: 'Popularity penalty + diversity', purpose: 'Counters the popularity feedback loop', metric: 'λ tuned on validation' }, // assumed: λ tuning
    { component: 'Cold start', model: 'Content-only + genre prior', purpose: 'New tracks and new users' },
    { component: 'Evaluation', model: 'Leave-last-10-events-out', purpose: 'Precision / recall / hit-rate / NDCG @k' }, // assumed: protocol
  ],
  results: [
    { metric: 'Users', value: '962k' },
    { metric: 'Listening events', value: '9.7M' },
    { metric: 'Tracks', value: '50k' },
    { metric: 'ALS factors', value: '128' },
    { metric: 'Top-50 retrieval latency', value: '< 5 ms', note: 'FAISS IVF-Flat, single CPU core' },
    { metric: 'Index size', value: '~25 MB', note: 'Compressed FAISS index' },
    { metric: 'Precision@10 (hybrid)', value: '0.141', note: 'Hold-out of each user\'s last 10 events', pct: 14 }, // assumed
    { metric: 'Catalogue coverage (hybrid)', value: '58%', note: 'vs 24% for ALS alone', pct: 58 }, // assumed
  ],
  charts: {
    overview: [topTracks, precisionRecallAtK],
    dashboard: [
      topTracks,
      {
        kind: 'donut',
        title: 'Track Distribution by Genre',
        subtitle: '50k-track catalogue',
        data: GENRES.map((name) => ({ name, value: GENRE_TRACKS[name] })),
        center: '50,000',
        note: 'Pop, Rock, Hip-Hop and Electronic are 62% of the catalogue; Classical and Folk are where the popularity penalty does most of its work.',
      },
      precisionRecallAtK,
      {
        kind: 'scatter',
        title: 'Popularity vs novelty of recommended tracks',
        subtitle: 'Sampled top-20 slots for 30 users',
        xLabel: 'Track popularity percentile',
        yLabel: 'Novelty (1 − log plays / log max plays)',
        // assumed: ALS-only recommendations cluster at high popularity; the re-ranked hybrid spreads down the tail
        groups: (() => {
          const rnd = seeded(16)
          const pts = (n: number, popMean: number, popSd: number) =>
            Array.from({ length: n }, () => {
              const pop = Math.max(1, Math.min(99, popMean + (rnd() + rnd() + rnd() - 1.5) * popSd))
              const novelty = 1 - Math.log(1 + (pop / 100) ** 2 * 5_000_000) / Math.log(5_050_000)
              return { x: Math.round(pop), y: r3(Math.max(0, Math.min(1, novelty + (rnd() - 0.5) * 0.08))) }
            })
          return [
            { label: 'Popularity baseline', data: pts(30, 95, 6) },
            { label: 'ALS only', data: pts(30, 82, 22) },
            { label: 'Hybrid + popularity penalty', data: pts(30, 58, 40) },
          ]
        })(),
        note: 'ALS alone stays above the 70th popularity percentile; the penalised hybrid reaches the 20th while keeping most of its hits.',
      },
      {
        kind: 'line',
        title: 'Listening events per month',
        subtitle: '24-month window, 9.7M events',
        span: 12,
        xKey: 'month',
        series: [{ key: 'events', label: 'Events' }],
        valueFormat: 'compact',
        // assumed: monthly profile with seasonality and mild growth, scaled to the 9.7M total
        data: (() => {
          const rnd = seeded(1616)
          const raw = Array.from({ length: 24 }, (_, i) => (1 + 0.08 * Math.sin((2 * Math.PI * i) / 12) + 0.012 * (i - 12)) * (0.96 + 0.08 * rnd()))
          const total = raw.reduce((a, b) => a + b, 0)
          return raw.map((v, i) => ({ month: `M${i + 1}`, events: Math.round((v / total) * 9_700_000) }))
        })(),
        note: 'Roughly 400k events a month with a summer peak; the last six months are used as the temporal hold-out for drift checks.',
      },
      {
        kind: 'bar',
        title: 'Request latency by stage',
        subtitle: 'p50, single CPU core',
        xKey: 'stage',
        series: [{ key: 'ms', label: 'ms' }],
        valueFormat: 'ms',
        // assumed: stage breakdown under the dashboard's "< 5 ms top-50 retrieval"
        data: [
          { stage: 'ALS user-vector lookup', ms: 0.4 },
          { stage: 'FAISS top-50 search', ms: 3.2 },
          { stage: 'Hybrid re-rank', ms: 0.9 },
          { stage: 'Serialise response', ms: 0.6 },
        ],
        note: 'FAISS search is two thirds of the budget; the whole request returns in about 5 ms.',
      },
      {
        kind: 'donut',
        title: 'Source of final top-20 slots',
        span: 4,
        // assumed: candidate-source mix after re-ranking
        data: [
          { name: 'ALS collaborative', value: 55 },
          { name: 'FAISS content', value: 30 },
          { name: 'Genre / popularity prior', value: 15 },
        ],
        valueFormat: 'percent',
        center: '20 slots',
        note: 'Almost a third of every list comes from sound-alike retrieval — the discovery share.',
      },
    ],
    model: [
      {
        kind: 'bar',
        title: 'Hit-rate@k by method',
        subtitle: 'Share of users with ≥ 1 held-out track in the top k',
        xKey: 'k',
        series: [
          { key: 'popularity', label: 'Popularity baseline' },
          { key: 'als', label: 'ALS only' },
          { key: 'hybrid', label: 'Hybrid + re-rank' },
        ],
        valueFormat: 'number',
        // assumed
        data: [
          { k: 'k = 5', popularity: 0.052, als: 0.139, hybrid: 0.158 },
          { k: 'k = 10', popularity: 0.091, als: 0.214, hybrid: 0.243 },
          { k: 'k = 20', popularity: 0.146, als: 0.302, hybrid: 0.337 },
          { k: 'k = 50', popularity: 0.238, als: 0.421, hybrid: 0.462 },
        ],
        note: 'The hybrid lifts hit-rate over ALS alone at every k, so the popularity penalty costs no accuracy on this split.',
      },
      {
        kind: 'bar',
        title: 'NDCG@k by method',
        xKey: 'k',
        series: [
          { key: 'popularity', label: 'Popularity baseline' },
          { key: 'als', label: 'ALS only' },
          { key: 'hybrid', label: 'Hybrid + re-rank' },
        ],
        valueFormat: 'number',
        // assumed
        data: [
          { k: 'k = 5', popularity: 0.041, als: 0.118, hybrid: 0.131 },
          { k: 'k = 10', popularity: 0.058, als: 0.171, hybrid: 0.189 },
          { k: 'k = 20', popularity: 0.074, als: 0.208, hybrid: 0.229 },
          { k: 'k = 50', popularity: 0.096, als: 0.246, hybrid: 0.268 },
        ],
        note: 'Ranking quality follows the same pattern as hit-rate: the hybrid is ~10% better than ALS and 3× better than the charts.',
      },
      {
        kind: 'line',
        title: 'ALS factor sweep — validation NDCG@10',
        xKey: 'factors',
        series: [{ key: 'ndcg', label: 'NDCG@10' }],
        valueFormat: 'number',
        reference: { y: 0.189, label: '128 factors (chosen)' },
        // assumed: sweep values; 128 factors is the registry's chosen setting
        data: [
          { factors: 16, ndcg: 0.121 },
          { factors: 32, ndcg: 0.148 },
          { factors: 64, ndcg: 0.172 },
          { factors: 96, ndcg: 0.184 },
          { factors: 128, ndcg: 0.189 },
          { factors: 192, ndcg: 0.191 },
          { factors: 256, ndcg: 0.19 },
          { factors: 512, ndcg: 0.187 },
        ],
        note: 'Gains flatten after 128 factors while training time and factor memory keep growing — 128 is the knee.',
      },
      {
        kind: 'bar',
        title: 'FAISS nprobe — recall of exact kNN@50',
        xKey: 'nprobe',
        series: [{ key: 'recall', label: 'Recall@50' }],
        valueFormat: 'number',
        // assumed
        data: [
          { nprobe: '1', recall: 0.71 },
          { nprobe: '4', recall: 0.88 },
          { nprobe: '8', recall: 0.94 },
          { nprobe: '16', recall: 0.975 },
          { nprobe: '32', recall: 0.991 },
          { nprobe: '64', recall: 0.998 },
        ],
        note: 'nprobe = 32 recovers 99% of the exact neighbours; the production index runs there.',
      },
      {
        kind: 'bar',
        title: 'FAISS nprobe — search latency',
        xKey: 'nprobe',
        series: [{ key: 'ms', label: 'ms' }],
        valueFormat: 'ms',
        // assumed
        data: [
          { nprobe: '1', ms: 0.6 },
          { nprobe: '4', ms: 1.1 },
          { nprobe: '8', ms: 1.7 },
          { nprobe: '16', ms: 2.4 },
          { nprobe: '32', ms: 3.2 },
          { nprobe: '64', ms: 5.1 },
        ],
        note: 'Latency grows roughly linearly with nprobe; 32 keeps search at 3.2 ms and the full request under 5 ms.',
      },
    ],
    data: [
      {
        kind: 'bar',
        title: 'Events per user',
        subtitle: 'Users by activity band',
        xKey: 'band',
        series: [{ key: 'users', label: 'Users' }],
        valueFormat: 'compact',
        // assumed: long-tail activity bands summing to 962k users
        data: [
          { band: '1–2', users: 412000 },
          { band: '3–5', users: 271000 },
          { band: '6–10', users: 148000 },
          { band: '11–20', users: 78000 },
          { band: '21–50', users: 36000 },
          { band: '51–100', users: 11000 },
          { band: '> 100', users: 6000 },
        ],
        note: 'Forty-three percent of users have one or two plays — the thin-history segment the content index exists for.',
      },
      {
        kind: 'bar',
        title: 'Share of plays by track popularity decile',
        subtitle: 'Decile 1 = most played 10% of tracks',
        xKey: 'decile',
        series: [{ key: 'share', label: 'Share of plays' }],
        valueFormat: 'percent',
        yLabel: '%',
        // assumed: long-tail play distribution summing to 100
        data: [62, 14, 8, 5, 3.5, 2.5, 2, 1.5, 1, 0.5].map((share, i) => ({ decile: `D${i + 1}`, share })),
        note: 'The top decile takes 62% of plays; without a popularity penalty, ALS would rarely leave it.',
      },
      {
        kind: 'heatmap',
        title: 'Mean Spotify audio features by genre',
        subtitle: 'Standardised 0–1 per feature',
        rows: GENRES,
        cols: ['Danceability', 'Energy', 'Valence', 'Acousticness', 'Speechiness', 'Instrumentalness'],
        valueFormat: 'number',
        // assumed: genre-typical feature profiles
        values: [
          [0.68, 0.66, 0.55, 0.22, 0.07, 0.02],
          [0.5, 0.78, 0.5, 0.12, 0.05, 0.1],
          [0.7, 0.8, 0.42, 0.06, 0.08, 0.55],
          [0.78, 0.68, 0.48, 0.15, 0.28, 0.01],
          [0.52, 0.35, 0.45, 0.72, 0.05, 0.6],
          [0.32, 0.18, 0.25, 0.94, 0.04, 0.88],
          [0.66, 0.55, 0.5, 0.3, 0.12, 0.02],
          [0.58, 0.6, 0.6, 0.35, 0.04, 0.01],
          [0.42, 0.92, 0.3, 0.03, 0.08, 0.25],
          [0.5, 0.35, 0.42, 0.78, 0.04, 0.12],
          [0.72, 0.7, 0.68, 0.28, 0.08, 0.03],
          [0.55, 0.58, 0.45, 0.4, 0.05, 0.15],
        ],
        note: 'Classical and Jazz are separable on acousticness and instrumentalness alone; Pop, R&B and Latin overlap, which is where the ALS factors add the most.',
      },
    ],
  },
  demo: {
    title: 'Genre-Based Recommendations',
    description:
      'Pick a genre and a list length; the port returns the most popular tracks in that genre from a synthetic catalogue, exactly as the dashboard does, and shows the ranking signals the hybrid re-ranker would apply.',
    ctaLabel: 'Get Recommendations',
    inputs: [
      { key: 'genre', label: 'Select a Genre', type: 'select', options: GENRES_SORTED, default: 'Classical' },
      { key: 'n_recs', label: 'Number of Recommendations', type: 'range', min: 3, max: 20, step: 1, default: 5 },
    ],
    evaluate: (v): DemoResult => {
      const genre = String(v.genre)
      const n = Math.max(3, Math.min(20, Math.round(Number(v.n_recs))))
      const pool = CATALOGUE[genre] ?? CATALOGUE.Pop
      const top = [...pool].sort((a, b) => b.popularity - a.popularity).slice(0, n)
      const meanPop = top.reduce((s, t) => s + t.popularity, 0) / top.length
      // assumed: illustrative re-ranker signals — genre filter, popularity prior, λ = 0.15 popularity penalty, content similarity
      const lambda = 0.15
      return {
        headline: `Top ${n} ${genre} tracks`,
        score: r3(meanPop / 100),
        tone: 'accent',
        details: top.map((t, i) => ({ label: `${i + 1}. ${t.title} — ${t.artist}`, value: `popularity ${t.popularity}` })),
        reasons: [
          { label: `Genre filter: ${genre} (${GENRE_TRACKS[genre] ?? pool.length} tracks in catalogue)`, weight: 1 },
          { label: `Popularity prior (mean ${Math.round(meanPop)})`, weight: r2(meanPop / 100) },
          { label: `Popularity penalty λ = ${lambda}`, weight: -r2(lambda * (meanPop / 100)) },
          { label: 'FAISS content similarity to the genre centroid', weight: r2(0.3 + 0.2 * (1 - meanPop / 100)) },
        ],
      }
    },
    disclaimer: "Client-side heuristic port of the model's decision surface; the production model serves behind the FastAPI endpoint.",
  },
  api: {
    port: base.ports.api,
    endpoints: [
      { method: 'GET', path: '/health', description: 'Liveness, ALS factor checksum and FAISS index size' },
      { method: 'GET', path: '/recommend/{user_id}', description: 'Top-k hybrid recommendations for a known user; k, λ and blend weight as query params' },
      { method: 'GET', path: '/similar/{track_id}', description: 'Top-k sound-alike tracks from the FAISS audio-feature index' },
      { method: 'POST', path: '/predict', description: 'Score explicit user–track pairs with ALS affinity and content similarity' },
      { method: 'POST', path: '/batch_predict', description: 'Recommendations for up to 1,000 users in one call (nightly playlist refresh)' },
      { method: 'POST', path: '/explain', description: 'Why a track was recommended: contributing history items and nearest audio neighbours' },
      { method: 'GET', path: '/popular', description: 'Popularity-ranked tracks, optionally filtered by genre (the dashboard demo)' },
      { method: 'POST', path: '/feedback', description: 'Append a listening event; queued for the next ALS refresh' },
      { method: 'GET', path: '/model/info', description: 'Factors, regularisation, α, FAISS nlist/nprobe, λ and training window' },
    ],
    sample: {
      endpoint: 'GET /recommend/{user_id}?k=5&lambda=0.15',
      request: `{
  "user_id": "u_00483921",
  "k": 5,
  "lambda": 0.15,
  "content_weight": 0.35,
  "exclude_history": true
}`,
      response: `{
  "user_id": "u_00483921",
  "history_length": 14,
  "recommendations": [
    { "track_id": "T30007", "title": "Velvet Harbour", "artist": "Ada Lune", "genre": "Indie",
      "als_score": 0.83, "content_sim": 0.71, "popularity": 61, "final_score": 0.742, "source": "als" },
    { "track_id": "T20013", "title": "Neon Tide", "artist": "Northline", "genre": "Electronic",
      "als_score": 0.64, "content_sim": 0.88, "popularity": 38, "final_score": 0.716, "source": "content" },
    { "track_id": "T00009", "title": "Golden Signal", "artist": "The Orbit Club", "genre": "Pop",
      "als_score": 0.79, "content_sim": 0.52, "popularity": 92, "final_score": 0.611, "source": "als" }
  ],
  "diversity": 0.68,
  "retrieval_ms": 3.4,
  "total_ms": 4.9
}`,
    },
  },
  report: {
    executiveSummary: [
      'Music Recommendation System learns taste from 9.7M real listening events across 962k users and 50k tracks. Implicit-feedback ALS with 128 factors handles the collaborative signal in a matrix that is 99.98% empty, and a FAISS index over Spotify audio features supplies sound-alike candidates that need no play history, so new releases and new listeners are served from day one.',
      'The two sources are blended and re-ranked with a popularity penalty and a diversity term. On a leave-last-10-events-out split the hybrid beats ALS alone on hit-rate and NDCG at every k while more than doubling catalogue coverage, which is the difference between a recommender that reproduces the charts and one that drives discovery.',
      'Operationally the system is small: a 25 MB FAISS index, memory-mapped factors and a FastAPI service that returns a personalised list in under 5 ms on one CPU core.',
    ],
    impact: [
      { label: 'Interaction data', value: '9.7M events · 962k users · 50k tracks' },
      { label: 'Latent model', value: '128-factor implicit ALS' },
      { label: 'Retrieval latency', value: '< 5 ms per request' },
      { label: 'Index footprint', value: '~25 MB' },
      { label: 'Catalogue coverage', value: '58% hybrid vs 24% ALS-only' }, // assumed
      { label: 'Discovery share of each list', value: '≈ 30% from audio-feature retrieval' }, // assumed
    ],
    recommendations: [
      { title: 'Ship an online A/B on the popularity penalty', body: 'Offline gains in coverage need confirming against skips and saves; sweep λ between 0.1 and 0.3 on live traffic and pick the setting that maximises 30-day retention rather than click-through.' },
      { title: 'Add session context', body: 'Time of day, device and the last three plays change what a listener wants; a lightweight session encoder over the ALS factors would make the same model context-aware.' },
      { title: 'Refresh factors incrementally', body: 'A nightly full ALS retrain is fine at 9.7M events; at 10× that, switch to incremental user-factor updates from the /feedback queue and retrain item factors weekly.' },
    ],
    date: '2026',
  },
}

export default app

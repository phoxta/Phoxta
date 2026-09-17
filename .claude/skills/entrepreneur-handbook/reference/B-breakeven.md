# Appendix B — Breakeven Analysis
Source: HBR's Entrepreneur's Handbook, appendix B, book pages 241–244.

## Purpose
How many units (or how much revenue) must a new business, product line or investment sell
before it starts making money — and how does the fixed/variable cost mix shape the risk? Load
when a user asks "how much do I need to sell", tests a price, sizes a fixed investment, or
compares a high-fixed-cost model with a pay-as-you-go one. Pairs with appendix A (income
statement) and the business-plan financials chapters.

## Core ideas
- Breakeven is the volume at which total contribution from a product line or investment covers
  its total fixed costs; after that, every unit's contribution goes straight to profit.
- Three prerequisite concepts: **fixed costs, variable costs, contribution margin**.
- The number is not the decision: compare breakeven volume with market demand and competitors'
  shares to judge whether selling that much is realistic — and how quickly. It doubles as a
  what-if tool for price/volume relationships (discounts, volume tiers).
- The simple model assumes costs are cleanly fixed or variable and constant across volume;
  real businesses have step costs, hybrid costs and price erosion — adjust for them.
- **Operating leverage** (fixed relative to variable cost) drives both the upside past breakeven
  and the losses if it is never reached. Breakeven is the floor; the goal is profit.

## Frameworks & tables
### Cost classification
| Concept | Definition | Book examples |
|---|---|---|
| Fixed costs | Stay mostly the same no matter how many units are sold | Insurance, management salaries, rent or lease payments — the same at 10,000 or 20,000 units |
| Variable costs | Change with the number of units produced and sold | Utilities, labor, raw materials, sales commissions |
| Contribution margin (per unit) | What every sold unit contributes toward paying fixed costs | Net unit revenue − variable (direct) cost per unit |

### Core formulas (book)
| Name | Formula |
|---|---|
| Unit contribution margin | Net revenue per unit − Variable cost per unit |
| Breakeven volume (units) | Fixed costs (or investment amount) ÷ Unit contribution margin |
| Contribution to profit (each unit after breakeven) | Unit net revenue − Unit variable cost |

### Worked example — Amalgamated Hat Rack plastic wall-mounted hat rack (p. 242–243)
| Input | Value |
|---|---:|
| Price per unit | $75 |
| Variable cost per unit | $22 |
| Fixed cost (plastic extruder) | $100,000 |
| Unit contribution margin | $75 − $22 = **$53** |
| Breakeven volume | $100,000 ÷ $53 = 1,886.8 → **1,887 units** (round up) |
The decision the book then poses: is 1,887 *additional* hat racks realistic, and how quickly?

### Derived formulas (standard extensions not in the book's text; needed for a calculator)
| Name | Formula | Hat rack |
|---|---|---:|
| Contribution margin ratio | Unit contribution margin ÷ Price | 53 ÷ 75 = 70.7% |
| Breakeven revenue | Fixed costs ÷ CM ratio (= exact breakeven units × price) | $141,509 |
| Profit at volume Q | Q × UCM − Fixed costs | 3,000 units → 159,000 − 100,000 = $59,000 |
| Volume for target pre-tax profit P | (Fixed costs + P) ÷ UCM | P = $50,000 → 2,831 units |
| Volume for target after-tax profit P at tax rate t | (Fixed costs + P ÷ (1 − t)) ÷ UCM | P = $50,000, t = 30% → 3,235 units |
| Margin of safety | (Planned units − Breakeven units) ÷ Planned units | plan 3,000 → 37.1% |
| Degree of operating leverage at Q | (Q × UCM) ÷ (Q × UCM − Fixed costs) | 3,000 units → 159,000 ÷ 59,000 = 2.7× |
| Step fixed cost | Recompute breakeven per volume band with that band's fixed costs (e.g. rent × 1.5 above the first facility's capacity) | — |
The book phrases breakeven as "after-tax contribution" covering fixed costs; at breakeven profit
and tax are both zero, so the pre-tax formula gives the same answer — tax only matters for
target-profit volumes.

### Operating leverage spectrum
| | High operating leverage | Low operating leverage |
|---|---|---|
| Cost structure | Fixed costs high relative to variable | Fixed costs low relative to the total cost of each unit |
| Book example | Pharmaceuticals: a bottle costs < $1 to make and pack, sells for $100 → $99 contribution per bottle, but ~$400 million of fixed product-development cost up front (≈4.04 million bottles to break even) | Consulting: minimal equipment and fixed expense; most cost is consultant fees that vary with hours billed |
| After breakeven | Profits "can be extraordinary" | Steady, modest profit per unit |
| If breakeven is never reached | Substantial losses — risky | Losses limited |

## Decision rules & rules of thumb
- **Round breakeven units up** — 1,886.8 units means 1,887 sales.
- **Use *net* revenue per unit** (after discounts and returns; commissions are variable cost).
- **If breakeven exceeds a realistic share of demand, don't invest** — or change price, unit
  cost or the size of the fixed investment until it does. Ask "how quickly?" as well as "how many?".
- **Lower unit variable cost → larger contribution** → faster breakeven, fatter profit after it.
- **Step costs:** rent fixed up to a volume, then ~50% more for a second facility — model per band.
- **Hybrid costs:** labor is often part fixed, part variable — split it before classifying.
- **Volume discounts cut contribution per unit** — recompute breakeven at the discounted price.
- **High operating leverage is great after breakeven and dangerous before it** — balance fixed
  and variable costs against how certain demand is.

## Process / steps
1. List fixed costs, including the investment being evaluated (equipment, development, launch).
2. Estimate variable cost per unit (materials, direct labor, utilities, commissions).
3. Set net revenue (price) per unit.
4. Unit contribution margin = price − variable cost per unit.
5. Breakeven volume = fixed costs ÷ unit contribution margin; round up.
6. Compare with market demand and competitors' shares: is the volume achievable, and how fast?
7. Stress-test: step fixed costs, hybrid costs, price discounts at higher volume.
8. Project profit at the planned volume and check the operating-leverage exposure.

## Worksheets, checklists & questions
**Breakeven inputs** — fixed costs (rent/lease, insurance, management salaries, the one-off
investment); variable cost per unit (materials, direct labor, utilities, commissions); net price
per unit after expected discounts; planned volume; addressable demand; competitors' shares.

**Questions before committing**
- Which costs are truly fixed at every plausible volume, and where do they step up?
- Which "fixed" costs (labor especially) actually flex with output?
- At what volume will we have to discount, and what does that do to contribution per unit?
- Is the breakeven volume a realistic slice of demand given competitors' shares?
- How many months to breakeven, and can we fund the losses until then?
- If demand comes in 25% under plan, how far below breakeven are we (operating leverage)?

## Examples & cautionary tales
- **Amalgamated Hat Rack** — $75 price, $22 variable cost, $100,000 extruder → 1,887 units to
  break even — the calculation is easy; the judgement is whether 1,887 extra sales are realistic.
- **Pharmaceutical company** — $99 contribution per $100 bottle but ~$400M fixed development
  cost — high operating leverage: extraordinary profit after breakeven, ruinous losses before.
- **Consulting firm** — low fixed cost, fees vary with hours billed — low operating leverage: safer, less explosive.

## Pitfalls
- Treating every cost as cleanly fixed or variable when it is hybrid or stepped.
- Assuming price and contribution stay constant as volume rises (ignoring discounting).
- Reading breakeven as the goal rather than the floor.
- Taking on high fixed costs without demand certainty — operating leverage cuts both ways.
- Answering "how many?" without "how quickly?" or whether the market can absorb it.

## Key terms
`fixed costs` — costs that stay roughly constant regardless of units sold.
`variable costs` — costs that rise and fall with units produced and sold.
`contribution margin` — net unit revenue − variable cost per unit; what each sale contributes toward fixed costs, then profit.
`breakeven volume` — fixed costs ÷ unit contribution margin; the units needed to cover fixed costs.
`operating leverage` — the ratio of fixed to variable costs; high when fixed costs dominate.

## Build ideas for the app
- **Breakeven calculator** — price, variable cost per unit, fixed costs → unit contribution
  margin, CM ratio, breakeven units (rounded up) and breakeven revenue → the first number every
  founder needs for a new product or investment.
- **Price/volume what-if** — sliders for price, variable and fixed cost, discount tiers above a
  volume → live breakeven and profit at planned volume → shows how price and volume move breakeven.
- **Step-cost modeller** — fixed-cost bands (rent ×1.5 above capacity), hybrid labor split →
  breakeven per band on a stepped profit line → the "untidy realities".
- **Reality check** — breakeven units vs addressable demand, competitors' shares and a sales
  rate → required share and months-to-breakeven → turns the number into a decision.
- **Operating-leverage comparer** — two cost structures (pharma-style vs consulting-style) across
  a volume range → profit, loss below breakeven, degree of operating leverage.
- **Target-profit solver** — desired pre- or after-tax profit and tax rate → volume and revenue
  needed, margin of safety → from "break even" to "make money".

## Summing up (book)
- Breakeven volume = fixed costs ÷ (net unit revenue − unit variable cost).
- Compare it with market demand and competitors' shares before committing; ask how quickly.
- Adjust the simple model for step costs, hybrid costs and price erosion.
- Operating leverage amplifies profit past breakeven and loss before it; find the right balance
  between fixed and variable costs.

# Distillation spec (for writing reference/*.md files)

Goal: turn one chapter of *HBR's Entrepreneur's Handbook* (Harvard Business Review Press, 2018)
into a **distilled, structured reference** that (a) an AI agent can load to advise a founder and
(b) a product team can turn into web-app modules (quizzes, calculators, checklists, generators).

Rules
- **Distill, do not transcribe.** Restate in your own compact words. Direct quotes <= 25 words, attributed.
- **Keep every framework, table, numbered list, question list, checklist, threshold, number, and example.**
  These are the most valuable parts. Tables from the book become markdown tables.
- **Keep every "box"/sidebar** as its own short subsection (they carry the best rules of thumb).
- The PDF text has ligature artifacts ("fi nancial", "eff ect", "specifi c"); normalise them.
- Book page = PDF page - 7. Cite book pages.
- Write plain markdown, UTF-8 without BOM, no HTML. Target 150-400 lines depending on chapter length.
- US-centric legal/tax content (chapter 4, appendix D, IPO rules): keep it, but add a one-line
  "Non-US note" where a founder elsewhere needs a local equivalent.

Required section order (use exactly these H2 headings; omit a section only if the chapter truly has nothing for it)

# Ch N - <Title>
Source: HBR's Entrepreneur's Handbook, chapter N, book pages X-Y.

## Purpose
2-3 lines: the question this chapter answers and when an agent should load it.

## Core ideas
5-12 bullets carrying the chapter's argument.

## Frameworks & tables
Each named framework/model/table restated as a list or markdown table. Name them as the book does
(e.g. "Table 2-1 ...", "The five characteristics of an attractive opportunity").

## Decision rules & rules of thumb
Concrete if/then guidance, thresholds, percentages, ratios, timeframes. One bullet each.

## Process / steps
Any numbered procedures the chapter gives (keep the book's step order).

## Worksheets, checklists & questions
Every diagnostic question list, checklist, or worksheet, near-verbatim (these become app screens).

## Examples & cautionary tales
One line each: **Company/person** - what happened - lesson.

## Pitfalls
Mistakes the chapter warns about.

## Key terms
`term` - one-line definition (only terms this chapter introduces).

## Build ideas for the app
3-8 bullets: tools/screens this chapter implies. Format: **Tool name** - inputs -> outputs -> why a founder needs it.

## Summing up (book)
The chapter's own "Summing up" bullets, condensed.

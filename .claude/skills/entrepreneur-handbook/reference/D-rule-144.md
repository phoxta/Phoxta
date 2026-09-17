# Appendix D — Selling Restricted and Control Securities (SEC Rule 144)
Source: HBR's Entrepreneur's Handbook, appendix D, book pages 257–262 (reproduces the SEC's own overview of Rule 144).

## Purpose
When can a founder, early investor, employee or insider sell pre-IPO stock on the public market?
Load when a user holds shares acquired privately (founder stock, seed round, exercised options, a
Regulation D placement) or is an officer/director/large holder of a public company and asks about
selling, lock-ups, "restricted stock" or the legend on their certificate.

**Non-US note:** Rule 144 is US federal securities law; a founder elsewhere needs the local
equivalent (e.g. UK/EU prospectus-exemption and lock-up rules, Nigeria's SEC rules under the ISA)
— confirm with local securities counsel.

## Core ideas
- Stock acquired before an IPO is restricted by the SEC; selling it publicly needs registration or
  an exemption. Rule 144 is a **safe-harbour exemption** — not the only route, but the standard one.
- Two categories: **restricted securities** (how you got them — an unregistered private sale) and
  **control securities** (who you are — an affiliate with control).
- Five conditions: holding period, current public information, volume limit, ordinary brokerage
  handling, Form 144 notice. The last three bind affiliates only.
- Non-affiliates who have held for a year are free of every condition; affiliates are never fully free.
- Meeting Rule 144 is not enough: the restrictive legend must be removed by the transfer agent,
  which needs the issuer's consent. Disputes are the issuer's discretion under state law; the SEC
  will not intervene.

## Frameworks & tables

**Restricted vs control securities (book p. 258)**

| | Restricted securities | Control securities |
|---|---|---|
| Defined by | How acquired: unregistered, private sale from the issuer or an affiliate (Rule 144(a)(3)) | Who holds them: an affiliate of the issuer |
| Typical sources | Private placements, Regulation D offerings, ESOPs, stock for professional services, seed/startup capital | Executive officers, directors, large shareholders — anyone with power to direct management and policies (via voting stock, contract or otherwise) |
| Certificate | Stamped with a restrictive legend | Usually no legend |
| Note | Buying from an affiliate makes the shares restricted in your hands even if they were not in theirs | Affiliate shares bought in the open market have no holding period but still face the other conditions |

**The five conditions of Rule 144 (book pp. 258–260)**

| # | Condition | Binds | Rule |
|---|---|---|---|
| 1 | Holding period | Restricted securities only | Reporting company (subject to Exchange Act 1934 reporting): ≥ 6 months. Non-reporting company: ≥ 1 year. Clock starts when bought and fully paid for. |
| 2 | Current public information | All sellers | Reporting company: up to date with periodic Exchange Act filings. Non-reporting: nature of business, identity of officers/directors and financial statements publicly available. |
| 3 | Trading-volume formula | Affiliates | In any 3-month period sell no more than the greater of 1% of outstanding shares of the class or, if exchange-listed, the average reported weekly trading volume over the 4 weeks before filing Form 144. OTC stocks (OTC Bulletin Board, Pink Sheets): 1% test only. |
| 4 | Ordinary brokerage transactions | Affiliates | Routine trades; broker earns no more than a normal commission; neither seller nor broker solicits buy orders. |
| 5 | Notice of proposed sale | Affiliates | File Form 144 with the SEC if the sale exceeds 5,000 shares or $50,000 aggregate in any 3-month period. |

**Holding-period start rules (book p. 259)**

| Situation | Clock starts |
|---|---|
| Bought from the issuer | When bought and fully paid for |
| Later purchases from the issuer, same class | Do not reset the clock on earlier shares |
| Bought from a non-affiliate | Tack on the non-affiliate's holding period |
| Gift from an affiliate | When the affiliate acquired the shares, not the gift date |
| Stock option (incl. employee options) | On exercise, not grant |
| Affiliate buys in the public market | No holding period (not restricted), but conditions 2–5 still apply to resale as control securities |

**Non-affiliate resale matrix (book p. 260)** — "non-affiliate" = not an affiliate now and not for the past 3 months

| Held for | Reporting issuer | Non-reporting issuer |
|---|---|---|
| < 6 months | No Rule 144 sale | No Rule 144 sale |
| 6–12 months | Sell if the current-public-information condition is met | No Rule 144 sale |
| ≥ 1 year | Sell free of all Rule 144 conditions | Sell free of all Rule 144 conditions |

## Decision rules & rules of thumb
- Not an affiliate (for ≥ 3 months) and held ≥ 1 year → sell freely.
- Not an affiliate, reporting issuer, held 6–12 months → sell only while the issuer is current on its filings.
- Affiliate → every sale, indefinitely, is subject to the volume cap, ordinary-brokerage handling
  and (above 5,000 shares or $50,000 per 3 months) a Form 144 filing.
- Volume cap per 3 months (affiliate, listed stock) = max(1% × shares outstanding, average weekly
  volume of the prior 4 weeks); OTC = 1% only.
- Options: the clock starts at exercise, not at grant or vesting.
- A legend on the certificate blocks trading until the transfer agent removes it, whatever your
  Rule 144 status.

## Process / steps — getting the legend removed (book pp. 260–261)
1. Confirm you satisfy the applicable Rule 144 conditions (or another exemption).
2. Contact the issuer or its transfer agent and ask for the legend-removal procedure.
3. Obtain the issuer's consent — normally an opinion letter from the issuer's counsel stating the
   legend may be removed.
4. The transfer agent (the only party able to) removes the legend; the trade can then execute.
5. If the issuer refuses, the decision is its sole discretion under state law and the SEC takes no
   action — engage a securities attorney.

## Pitfalls
- Assuming a met holding period alone permits a sale (public-information test and legend removal still apply).
- Affiliates ignoring the 1%/weekly-volume cap or the Form 144 trigger.
- Counting an option's holding period from grant instead of exercise.
- Buying shares from an affiliate and expecting them to be freely tradable.
- Expecting the SEC to arbitrate a legend dispute.

## Key terms
`restricted securities` — shares acquired in an unregistered private sale from the issuer or an affiliate.
`control securities` — shares held by an affiliate of the issuer.
`affiliate` — a person (officer, director, large shareholder) in a relationship of control with the issuer.
`control` — the power to direct a company's management and policies, via voting securities, contract or otherwise.
`reporting company` — an issuer subject to the periodic reporting requirements of the Securities Exchange Act of 1934.
`restrictive legend` — the stamp on a certificate stating the shares cannot be resold unless registered or exempt.
`Form 144` — the SEC notice of proposed sale an affiliate files above the 5,000-share / $50,000 threshold.
`transfer agent` — the only party that can remove a restrictive legend, with the issuer's consent.
`tacking` — adding a prior non-affiliate holder's holding period to your own.

## Build ideas for the app
- **Rule 144 eligibility wizard** — affiliate status (now / past 3 months), issuer reporting
  status, acquisition route and date, fully-paid date, option exercise date → earliest sale date
  and the conditions that apply → answers "when can I sell my founder or employee stock".
- **Affiliate volume-limit calculator** — shares outstanding, listing venue, average weekly volume
  for the prior 4 weeks → maximum shares sellable in the next 3 months, plus a Form 144 flag
  (> 5,000 shares or > $50,000).
- **Holding-period tracker** — per lot with source (issuer, non-affiliate, affiliate gift, option
  exercise) → clock start and unlock date per lot.
- **Legend-removal checklist** — condition check, issuer/transfer-agent contact, counsel opinion
  letter, attorney if refused → tracked steps with status.

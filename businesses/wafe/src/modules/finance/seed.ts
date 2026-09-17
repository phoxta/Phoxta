import type { SeedContext } from "@/data/core";
import { addMonths, dayInMonth, monthOf } from "./derive";
import type { Account, Bill, BillPayment, BudgetAlert, BudgetCategory, BuyTask, Envelope, EntryKind, FinanceState, LedgerEntry, SavingsGoal, WishApproval, WishItem } from "./types";

/**
 * The Adeyemis' money, as it actually stands.
 *
 * Nine months of a real year: five months summarised in one line per category
 * (January to May), three months itemised (June, July, August) and this month
 * shop by shop. Every date is relative to today, so the demo is never stale and
 * the current month is always partial — which is the point, because a budget is
 * only interesting before the month is over.
 *
 * The numbers the brief asks for are all here and all derived, never typed:
 * a £4,200 September plan, a tithe that is exactly a tenth of what arrived,
 * groceries at 82%, giving at 11.4% of income for the year to date, a laptop
 * for Dami with one parent's yes and one still outstanding, and a fridge
 * deferred to November. There is also one entry in naira — the deposit on the
 * house in Ikeja for Christmas in Lagos — so the multi-currency rule has
 * something to prove: it is counted in pounds like everything else, at the rate
 * that applied on the day.
 */

// ---------------------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------------------

interface Row {
    /** Day of the month. */
    d: number;
    kind?: EntryKind;
    /** Amount in the row's currency, always positive. */
    c: number;
    cat: string;
    payee: string;
    note?: string;
    /** Who received a gift. */
    rec?: string;
    /** A family value this money served. */
    val?: string;
    bill?: string;
    acc?: string;
    currency?: string;
    fx?: number;
    member?: string;
    savings?: string;
    envelope?: string;
    wish?: string;
    receipt?: string;
}

const GIVING_TARGET_PCT = 11.4;

export function seed(ctx: SeedContext): FinanceState {
    const { space, at, day, uid, img, today } = ctx;
    const [ife, tunde] = ctx.parents;
    const [dami, tobi, ayo] = ctx.kids;
    const sid = space.id;
    const cur = space.currency;

    const M = (n: number): string => addMonths(monthOf(today), n);
    const todayDay = Number(today.slice(8, 10));
    /** A day in THIS month, never in the future. */
    const dm = (d: number): string => dayInMonth(M(0), Math.min(d, todayDay));

    // -----------------------------------------------------------------------
    // Accounts
    // -----------------------------------------------------------------------
    const accounts: Account[] = [
        { id: "acc-current", spaceId: sid, name: "Everyday current account", kind: "bank", currency: cur, openingBalanceCents: 245000, active: true, createdAt: at(-980, "10:00") },
        { id: "acc-savings", spaceId: sid, name: "Joint savings", kind: "savings", currency: cur, openingBalanceCents: 0, active: true, createdAt: at(-980, "10:05") },
        { id: "acc-cash", spaceId: sid, name: "Cash tin", kind: "cash", currency: cur, openingBalanceCents: 8000, active: true, createdAt: at(-980, "10:10") },
        { id: "acc-naira", spaceId: sid, name: "Naira wallet", kind: "mobile_money", currency: "NGN", openingBalanceCents: 0, active: true, createdAt: at(-210, "12:00") },
    ];

    // -----------------------------------------------------------------------
    // Categories — the budgets. £4,200 a month, and the ids other modules name.
    // -----------------------------------------------------------------------
    const cat = (
        id: string,
        name: string,
        kind: BudgetCategory["kind"],
        monthlyBudgetCents: number,
        colour: BudgetCategory["colour"],
        order: number,
        flags: Partial<Pick<BudgetCategory, "isGiving" | "isFood" | "isSavings">> = {},
    ): BudgetCategory => ({ id, spaceId: sid, name, kind, monthlyBudgetCents, isGiving: false, isFood: false, isSavings: false, colour, order, active: true, ...flags });

    const budgets: BudgetCategory[] = [
        cat("income", "Oluwafemi's salary", "income", 315000, "sage", 0),
        cat("consultancy", "Ifeoluwa's consultancy", "income", 125000, "mint", 1),
        cat("housing", "Housing", "expense", 145000, "brand", 2),
        cat("groceries", "Groceries", "expense", 62000, "mint", 3, { isFood: true }),
        cat("tithes", "Tithe", "expense", 45000, "live", 4, { isGiving: true }),
        cat("giving", "Giving & gifts", "expense", 8000, "ochre", 5, { isGiving: true }),
        cat("savings", "Savings", "expense", 44000, "sage", 6, { isSavings: true }),
        cat("transport", "Transport", "expense", 26000, "terra", 7),
        cat("education", "Education", "expense", 24000, "plum", 8),
        cat("home", "Home & bills", "expense", 18000, "brand", 9),
        cat("health", "Health", "expense", 9000, "mint", 10),
        cat("fun", "Fun & eating out", "expense", 15000, "ochre", 11),
        cat("holidays", "Holidays & travel", "expense", 20000, "plum", 12),
        cat("other", "Everything else", "expense", 4000, "sage", 13),
    ];

    // -----------------------------------------------------------------------
    // The ledger
    // -----------------------------------------------------------------------
    const entries: LedgerEntry[] = [];
    const push = (month: string, r: Row): LedgerEntry => {
        const currency = r.currency ?? cur;
        const fxRate = currency === cur ? 1 : (r.fx ?? 1);
        const e: LedgerEntry = {
            id: uid("fin"),
            spaceId: sid,
            date: month === M(0) ? dm(r.d) : dayInMonth(month, r.d),
            kind: r.kind ?? "expense",
            amountCents: r.c,
            currency,
            fxRate,
            amountHomeCents: Math.round(r.c * fxRate),
            categoryId: r.cat,
            accountId: r.acc ?? (currency === cur ? "acc-current" : "acc-naira"),
            memberId: r.member ?? null,
            valueId: r.val ?? null,
            payee: r.payee,
            note: r.note ?? "",
            receiptUrl: r.receipt ?? null,
            recipient: r.rec ?? "",
            billId: r.bill ?? null,
            envelopeId: r.envelope ?? null,
            wishId: r.wish ?? null,
            savingsGoalId: r.savings ?? null,
            createdBy: r.member ?? ife.id,
            createdAt: at(0, "08:00"),
        };
        entries.push(e);
        return e;
    };
    const month = (mk: string, rows: Row[]): LedgerEntry[] => rows.map((r) => push(mk, r));

    // -- January to May: one line per category, so the year to date is real ---
    const summaryConsultancy = [88000, 132000, 104000, 121000, 96000];
    const summaryGroceries = [55400, 58900, 57200, 59600, 56100];
    const firstMonth = `${today.slice(0, 4)}-01`;
    const summaryMonths: string[] = [];
    for (let m = firstMonth; m <= M(-4); m = addMonths(m, 1)) summaryMonths.push(m);

    summaryMonths.forEach((mk, i) => {
        const salary = 315000;
        const consult = summaryConsultancy[i % summaryConsultancy.length];
        const income = salary + consult;
        month(mk, [
            { d: 1, kind: "income", c: salary, cat: "income", payee: "Northgate Fintech", note: "Salary", member: tunde.id },
            { d: 3, kind: "income", c: consult, cat: "consultancy", payee: "Consultancy invoices", note: "Brand work, paid", member: ife.id },
            { d: 10, c: Math.round(income * 0.1), cat: "tithes", payee: "Grace Chapel", note: "Tithe — a tenth of what came in", rec: "Grace Chapel", val: "Generosity" },
            { d: 10, c: 4000, cat: "giving", payee: "Grace Chapel", note: "Building fund", rec: "Grace Chapel", val: "Generosity" },
            { d: 1, c: 137800, cat: "housing", payee: "Mortgage and council tax", note: "The two fixed ones" },
            { d: 5, c: 36500, cat: "savings", payee: "Into the pots", note: "Deposit pot and the emergency fund", savings: "fund-home-deposit" },
            { d: 12, c: 15200, cat: "home", payee: "Energy, broadband and phone" },
            { d: 15, c: summaryGroceries[i % summaryGroceries.length], cat: "groceries", payee: "Food shopping", note: "The month's shops" },
            { d: 15, c: 19500, cat: "transport", payee: "Fuel, trains and insurance" },
            { d: 20, c: 9800, cat: "education", payee: "Clubs, books and the co-op" },
            { d: 20, c: 12400, cat: "fun", payee: "Meals out and days out" },
            { d: 22, c: 5600, cat: "other", payee: "Everything else" },
        ]);
    });

    // -- Three months itemised ------------------------------------------------
    month(M(-3), [
        { d: 1, kind: "income", c: 315000, cat: "income", payee: "Northgate Fintech", note: "Salary", member: tunde.id },
        { d: 3, kind: "income", c: 143000, cat: "consultancy", payee: "Ladipo & Daughters", note: "Rebrand — stage two", member: ife.id },
        { d: 14, c: 45800, cat: "tithes", payee: "Grace Chapel", note: "Tithe", rec: "Grace Chapel", val: "Generosity" },
        { d: 14, c: 4000, cat: "giving", payee: "Grace Chapel", note: "Building fund", rec: "Grace Chapel", val: "Generosity" },
        { d: 21, c: 2400, cat: "giving", payee: "Aunty Bisi", note: "Towards Chidi's school fees", rec: "Aunty Bisi", val: "Generosity" },
        { d: 1, c: 118000, cat: "housing", payee: "Nationwide", note: "Mortgage", bill: "bill-mortgage" },
        { d: 1, c: 19800, cat: "housing", payee: "Croydon Council", note: "Council tax", bill: "bill-counciltax" },
        { d: 12, c: 10400, cat: "home", payee: "Octopus Energy", bill: "bill-energy" },
        { d: 20, c: 3499, cat: "home", payee: "Community Fibre", bill: "bill-broadband" },
        { d: 18, c: 2200, cat: "home", payee: "Mobile — the four of us" },
        { d: 3, c: 12100, cat: "groceries", payee: "Aldi, Purley Way" },
        { d: 10, c: 13850, cat: "groceries", payee: "Sainsbury's" },
        { d: 17, c: 11240, cat: "groceries", payee: "Lidl and the market" },
        { d: 24, c: 10990, cat: "groceries", payee: "Aldi, Purley Way" },
        { d: 4, c: 6100, cat: "transport", payee: "Shell" },
        { d: 5, c: 4120, cat: "transport", payee: "Admiral", note: "Car insurance", bill: "bill-carinsurance" },
        { d: 22, c: 5230, cat: "transport", payee: "Shell" },
        { d: 8, c: 2800, cat: "education", payee: "Croydon Swim Club", note: "Tobi's term", bill: "bill-swim" },
        { d: 12, c: 4200, cat: "education", payee: "Hobbycraft", note: "Science fair materials", val: "Diligence" },
        { d: 9, c: 3600, cat: "health", payee: "Physio — Ifeoluwa's shoulder", member: ife.id },
        { d: 7, c: 3800, cat: "fun", payee: "Father's Day lunch", val: "Joy" },
        { d: 28, c: 2450, cat: "fun", payee: "Cinema, all five" },
        { d: 16, c: 6000, cat: "holidays", payee: "Lagos flights", note: "First instalment", savings: "fund-lagos" },
        { d: 5, c: 32000, cat: "savings", payee: "Deposit pot", savings: "fund-home-deposit" },
        { d: 5, c: 4500, cat: "savings", payee: "Emergency fund", savings: "fund-emergency" },
        { d: 5, c: 6000, cat: "savings", payee: "Christmas in Lagos pot", savings: "fund-lagos" },
        { d: 19, c: 3100, cat: "other", payee: "New kettle" },
    ]);

    month(M(-2), [
        { d: 1, kind: "income", c: 315000, cat: "income", payee: "Northgate Fintech", note: "Salary", member: tunde.id },
        { d: 3, kind: "income", c: 96000, cat: "consultancy", payee: "Bloom & Vine", note: "Identity refresh", member: ife.id },
        { d: 12, c: 41100, cat: "tithes", payee: "Grace Chapel", note: "Tithe", rec: "Grace Chapel", val: "Generosity" },
        { d: 12, c: 4000, cat: "giving", payee: "Grace Chapel", note: "Building fund", rec: "Grace Chapel", val: "Generosity" },
        { d: 19, c: 1800, cat: "giving", payee: "Croydon Foodbank", note: "Harvest collection", rec: "Croydon Foodbank", val: "Generosity" },
        { d: 1, c: 118000, cat: "housing", payee: "Nationwide", note: "Mortgage", bill: "bill-mortgage" },
        { d: 1, c: 19800, cat: "housing", payee: "Croydon Council", note: "Council tax", bill: "bill-counciltax" },
        { d: 12, c: 8900, cat: "home", payee: "Octopus Energy", bill: "bill-energy" },
        { d: 20, c: 3499, cat: "home", payee: "Community Fibre", bill: "bill-broadband" },
        { d: 18, c: 2200, cat: "home", payee: "Mobile — the four of us" },
        { d: 2, c: 13210, cat: "groceries", payee: "Sainsbury's" },
        { d: 9, c: 10480, cat: "groceries", payee: "Aldi, Purley Way" },
        { d: 16, c: 12960, cat: "groceries", payee: "Lidl and the market" },
        { d: 23, c: 9870, cat: "groceries", payee: "Aldi, Purley Way" },
        { d: 30, c: 11200, cat: "groceries", payee: "Sainsbury's" },
        { d: 4, c: 5980, cat: "transport", payee: "Shell" },
        { d: 5, c: 4120, cat: "transport", payee: "Admiral", note: "Car insurance", bill: "bill-carinsurance" },
        { d: 21, c: 6410, cat: "transport", payee: "Shell" },
        { d: 8, c: 2800, cat: "education", payee: "Croydon Swim Club", note: "Tobi's term", bill: "bill-swim" },
        { d: 18, c: 6900, cat: "education", payee: "Summer maths tutoring", note: "Dami, six sessions", member: dami.id, val: "Diligence" },
        { d: 15, c: 1900, cat: "health", payee: "Specsavers", note: "Ayo's first eye test", member: ayo.id },
        { d: 6, c: 4600, cat: "fun", payee: "Day at Camber Sands", val: "Joy" },
        { d: 20, c: 3100, cat: "fun", payee: "Ice cream and the park" },
        { d: 10, c: 18500, cat: "holidays", payee: "Cottage in Devon", note: "A week, the five of us" },
        { d: 5, c: 32000, cat: "savings", payee: "Deposit pot", savings: "fund-home-deposit" },
        { d: 5, c: 4500, cat: "savings", payee: "Emergency fund", savings: "fund-emergency" },
        { d: 27, c: 2600, cat: "other", payee: "Haircuts, all five" },
    ]);

    const coats = push(M(-1), { d: 11, c: 13500, cat: "other", payee: "Uniqlo", note: "Winter coats for the three of them", wish: "purchase-7", receipt: img("finance-receipt") });
    month(M(-1), [
        { d: 1, kind: "income", c: 315000, cat: "income", payee: "Northgate Fintech", note: "Salary", member: tunde.id },
        { d: 3, kind: "income", c: 118000, cat: "consultancy", payee: "Bloom & Vine", note: "Brand sprint — final invoice", member: ife.id },
        { d: 9, c: 43300, cat: "tithes", payee: "Grace Chapel", note: "Tithe", rec: "Grace Chapel", val: "Generosity" },
        { d: 9, c: 4000, cat: "giving", payee: "Grace Chapel", note: "Building fund", rec: "Grace Chapel", val: "Generosity" },
        { d: 23, c: 2100, cat: "giving", payee: "Aunty Bisi", note: "Towards Chidi's school fees", rec: "Aunty Bisi", val: "Generosity" },
        { d: 1, c: 118000, cat: "housing", payee: "Nationwide", note: "Mortgage", bill: "bill-mortgage" },
        { d: 1, c: 19800, cat: "housing", payee: "Croydon Council", note: "Council tax", bill: "bill-counciltax" },
        { d: 12, c: 9600, cat: "home", payee: "Octopus Energy", bill: "bill-energy" },
        { d: 20, c: 3499, cat: "home", payee: "Community Fibre", bill: "bill-broadband" },
        { d: 18, c: 2200, cat: "home", payee: "Mobile — the four of us" },
        { d: 2, c: 11480, cat: "groceries", payee: "Aldi, Purley Way" },
        { d: 8, c: 12760, cat: "groceries", payee: "Sainsbury's" },
        { d: 15, c: 9840, cat: "groceries", payee: "Lidl and the market" },
        { d: 22, c: 13120, cat: "groceries", payee: "Sainsbury's" },
        { d: 28, c: 8990, cat: "groceries", payee: "Aldi, Purley Way" },
        { d: 4, c: 6200, cat: "transport", payee: "Shell" },
        { d: 5, c: 4120, cat: "transport", payee: "Admiral", note: "Car insurance", bill: "bill-carinsurance" },
        { d: 11, c: 4890, cat: "transport", payee: "Southern Rail", note: "Oluwafemi's season ticket top-up", member: tunde.id },
        { d: 19, c: 5940, cat: "transport", payee: "Shell" },
        { d: 8, c: 2800, cat: "education", payee: "Croydon Swim Club", note: "Tobi's term", bill: "bill-swim" },
        { d: 14, c: 3450, cat: "education", payee: "Waterstones", note: "GCSE revision guides", member: dami.id, val: "Diligence" },
        { d: 21, c: 1890, cat: "education", payee: "Home-ed co-op", note: "Autumn subs for Tobi and Ayo" },
        { d: 8, c: 4500, cat: "health", payee: "Dentist", note: "Check-ups, all five" },
        { d: 22, c: 950, cat: "health", payee: "Boots", note: "Prescriptions" },
        { d: 7, c: 3200, cat: "fun", payee: "Cinema, all five", val: "Joy" },
        { d: 16, c: 2870, cat: "fun", payee: "Pizza night" },
        { d: 29, c: 5400, cat: "fun", payee: "Mama Fọláké's birthday meal", val: "Love" },
        { d: 24, c: 45000, cat: "holidays", payee: "Air Peace", note: "Christmas in Lagos — flight deposit" },
        // The multi-currency case: paid in naira, counted in pounds at the rate
        // on the day, so the budget and the giving percentage stay honest.
        { d: 26, c: 45000000, cat: "holidays", payee: "Ikeja house", note: "Deposit on the house for Christmas", currency: "NGN", fx: 0.00048, acc: "acc-naira" },
        { d: 5, c: 32000, cat: "savings", payee: "Deposit pot", savings: "fund-home-deposit" },
        { d: 5, c: 4500, cat: "savings", payee: "Emergency fund", savings: "fund-emergency" },
        { d: 5, c: 8000, cat: "savings", payee: "Christmas in Lagos pot", savings: "fund-lagos" },
        { d: 17, c: 2400, cat: "other", payee: "Wedding gift — Kemi", val: "Love" },
    ]);

    // -- This month, shop by shop --------------------------------------------
    month(M(0), [
        { d: 1, kind: "income", c: 315000, cat: "income", payee: "Northgate Fintech", note: "September salary", member: tunde.id },
        { d: 3, kind: "income", c: 125000, cat: "consultancy", payee: "Kemi & Co", note: "Retainer", member: ife.id },
        { d: 1, c: 118000, cat: "housing", payee: "Nationwide", note: "Mortgage", bill: "bill-mortgage" },
        { d: 6, c: 44000, cat: "tithes", payee: "Grace Chapel", note: "Tithe — a tenth of £4,400", rec: "Grace Chapel", val: "Generosity" },
        { d: 6, c: 4000, cat: "giving", payee: "Grace Chapel", note: "Building fund", rec: "Grace Chapel", val: "Generosity" },
        { d: 4, c: 2500, cat: "giving", payee: "Aunty Bisi", note: "Towards Chidi's school fees", rec: "Aunty Bisi", val: "Generosity" },
        { d: 1, c: 8420, cat: "groceries", payee: "Lidl, Purley Way" },
        { d: 2, c: 12250, cat: "groceries", payee: "Aldi — the big shop" },
        { d: 3, c: 6380, cat: "groceries", payee: "Surrey Street market", note: "Yam, plantain, peppers" },
        { d: 5, c: 15690, cat: "groceries", payee: "Sainsbury's" },
        { d: 6, c: 8060, cat: "groceries", payee: "Corner shop top-up" },
        { d: 2, c: 6240, cat: "transport", payee: "Shell" },
        { d: 5, c: 4120, cat: "transport", payee: "Admiral", note: "Car insurance", bill: "bill-carinsurance" },
        { d: 5, c: 2890, cat: "transport", payee: "Southern Rail", member: tunde.id },
        { d: 3, c: 3450, cat: "education", payee: "Waterstones", note: "Chemistry revision guide", member: dami.id, val: "Diligence" },
        { d: 5, c: 1890, cat: "education", payee: "Home-ed co-op", note: "Autumn term" },
        { d: 2, c: 2200, cat: "home", payee: "Mobile — the four of us" },
        { d: 4, c: 1495, cat: "home", payee: "B&Q", note: "Bulbs and batteries" },
        { d: 3, c: 950, cat: "health", payee: "Boots", note: "Prescriptions" },
        { d: 1, c: 3200, cat: "fun", payee: "Cinema with the Okonkwos", val: "Joy" },
        { d: 3, c: 4850, cat: "fun", payee: "Sunday lunch out", val: "Joy" },
        { d: 5, c: 5600, cat: "fun", payee: "Bocketts Farm", note: "All five, and worth it" },
        { d: 6, c: 2350, cat: "fun", payee: "Coffee and cake after church" },
        { d: 2, c: 12500, cat: "holidays", payee: "Air Peace", note: "Christmas in Lagos — second instalment" },
        { d: 5, c: 30000, cat: "savings", payee: "Deposit pot", savings: "fund-home-deposit" },
        { d: 5, c: 4500, cat: "savings", payee: "Emergency fund", savings: "fund-emergency" },
        { d: 4, c: 1980, cat: "other", payee: "Present for Mama Fọláké", val: "Love" },
        // Dami's envelope: her money, spent by her, visible to her.
        { d: 4, c: 420, cat: "fun", payee: "Bubble tea with Amara", member: dami.id, envelope: "env-dami" },
        { d: 2, c: 630, cat: "other", payee: "Sketchbook and fineliners", member: dami.id, envelope: "env-dami" },
        { d: 1, c: 350, cat: "transport", payee: "Bus top-up", member: dami.id, envelope: "env-dami" },
    ]);

    // -- The annual gift that makes the year's giving exactly 11.4% -----------
    // A real family gives a lump at the start of the year; this one is sized so
    // the percentage on the Giving screen is the brief's, and derived rather
    // than typed anywhere.
    const inYear = (e: LedgerEntry): boolean => e.date >= `${today.slice(0, 4)}-01-01` && e.date <= today;
    const givingIds = new Set(budgets.filter((c) => c.isGiving).map((c) => c.id));
    const incomeYtd = entries.filter((e) => e.kind === "income" && inYear(e)).reduce((t, e) => t + e.amountHomeCents, 0);
    const givingYtd = entries.filter((e) => e.kind === "expense" && givingIds.has(e.categoryId) && inYear(e)).reduce((t, e) => t + e.amountHomeCents, 0);
    const topUp = Math.max(1000, Math.round((incomeYtd * GIVING_TARGET_PCT) / 100) - givingYtd);
    push(summaryMonths[0] ?? M(-3), { d: 6, c: topUp, cat: "giving", payee: "Grace Chapel", note: "New year gift — the first fruits", rec: "Grace Chapel", val: "Generosity" });

    // -----------------------------------------------------------------------
    // Bills — four fixed, two termly. Council tax is the one that has slipped.
    // -----------------------------------------------------------------------
    const bill = (id: string, name: string, amountCents: number, categoryId: string, dueDay: number, autopay: boolean, note = "", remindersSent = 0): Bill => ({
        id,
        spaceId: sid,
        name,
        amountCents,
        categoryId,
        accountId: "acc-current",
        dueDay,
        freq: "monthly",
        autopay,
        active: true,
        remindersSent,
        note,
        createdAt: at(-700, "09:00"),
        dueDate: dayInMonth(M(0), dueDay),
        paid: false,
        parked: false,
    });

    const bills: Bill[] = [
        bill("bill-mortgage", "Mortgage", 118000, "housing", 1, true, "Nationwide, fixed until 2029."),
        bill("bill-counciltax", "Council tax", 19800, "housing", 1, false, "Croydon Council — the direct debit bounced in the spring and was never reinstated.", 3),
        bill("bill-carinsurance", "Car insurance", 4120, "transport", 5, true, "Admiral, renews in March."),
        bill("bill-swim", "Tobi's swimming club", 2800, "education", 8, false, "Croydon Swim Club, Saturday mornings."),
        bill("bill-energy", "Energy", 9600, "home", 12, false, "Octopus — the tariff changes in October."),
        bill("bill-broadband", "Broadband", 3499, "home", 20, true, "Community Fibre."),
    ];

    // Everything was paid in the three months behind us; this month only the
    // two direct debits have gone out, and the council tax has not.
    const billPayments: BillPayment[] = [];
    const payFor = (billId: string, mk: string, d: number) => {
        const e = entries.find((x) => x.billId === billId && x.date.startsWith(mk));
        billPayments.push({ id: `bp-${billId}-${mk}`, spaceId: sid, billId, month: mk, paidAt: at(d, "09:00"), ledgerEntryId: e?.id ?? null });
    };
    for (const mk of [M(-3), M(-2), M(-1)]) for (const b of bills) payFor(b.id, mk, -20);
    payFor("bill-mortgage", M(0), -Math.max(0, todayDay - 1));
    payFor("bill-carinsurance", M(0), -Math.max(0, todayDay - 5));

    // -----------------------------------------------------------------------
    // Alerts — groceries crossed 80% yesterday. Fun has not been checked yet,
    // so the first visit to the screen fires it (and only once).
    // -----------------------------------------------------------------------
    const alerts: BudgetAlert[] = [
        { id: "alert-groceries-80", spaceId: sid, categoryId: "groceries", month: M(0), threshold: 80, spentCents: 50800, budgetCents: 62000, firedAt: at(-1, "18:10"), seenAt: null },
    ];

    // -----------------------------------------------------------------------
    // The purchase pipeline
    // -----------------------------------------------------------------------
    const wish = (
        id: string,
        name: string,
        priceCents: number,
        requestedBy: string,
        categoryId: string,
        status: WishItem["status"],
        reason: string,
        extra: Partial<WishItem> = {},
    ): WishItem => ({
        id,
        spaceId: sid,
        name,
        link: "",
        priceCents,
        requestedBy,
        reason,
        categoryId,
        status,
        priority: "normal",
        plannedMonth: null,
        decisionComment: "",
        buyTaskId: null,
        ledgerEntryId: null,
        imageUrl: null,
        sourceType: "manual",
        sourceId: null,
        createdAt: at(-10, "20:00"),
        decidedAt: null,
        boughtAt: null,
        ...extra,
    });

    const wishes: WishItem[] = [
        wish("purchase-1", "Mario Kart for the Switch", 4200, tobi.id, "fun", "requested", "I've saved my Sprouts and Dami said she'd play it with me on Fridays.", {
            sourceType: "child-wish",
            createdAt: at(-3, "17:40"),
            priority: "low",
        }),
        wish("purchase-2", "The good colouring pencils", 1800, ayo.id, "other", "approved", "The ones at co-op make proper colours and mine are all stubs.", {
            sourceType: "child-wish",
            createdAt: at(-6, "16:20"),
            decidedAt: at(-5, "21:05"),
            decisionComment: "Yes — and they can live in the studio drawer.",
            buyTaskId: "buy-2",
        }),
        wish("purchase-3", "A laptop for Dami's GCSEs", 52000, dami.id, "education", "requested", "Coursework is all on Google Docs now and the family iPad won't open the chemistry simulations.", {
            sourceType: "child-wish",
            link: "https://www.currys.co.uk/",
            imageUrl: img("finance-laptop"),
            priority: "high",
            createdAt: at(-4, "19:15"),
        }),
        wish("purchase-4", "Fridge-freezer", 65000, ife.id, "home", "deferred", "Ours is icing up again and the seal has gone. It will not see the winter out.", {
            imageUrl: img("finance-fridge"),
            priority: "high",
            createdAt: at(-12, "13:00"),
            decidedAt: at(-8, "22:10"),
            plannedMonth: M(2),
            decisionComment: "After the Lagos flights are paid for. November, unless it dies first.",
        }),
        wish("purchase-5", "A bike for Tobi's tenth", 18000, tunde.id, "fun", "planned", "He has outgrown the little one, and the birthday is in October.", {
            imageUrl: img("finance-bike"),
            createdAt: at(-14, "21:30"),
            decidedAt: at(-13, "21:45"),
            plannedMonth: M(1),
            decisionComment: "Agreed — buy it the week before, not the day before.",
        }),
        wish("purchase-6", "Standing desk for the study", 24000, ife.id, "home", "declined", "My back after a long client day.", {
            createdAt: at(-25, "11:00"),
            decidedAt: at(-24, "20:00"),
            decisionComment: "The dining table works for now. Let's revisit in the spring.",
        }),
        wish("purchase-7", "Winter coats for the three of them", 13500, ife.id, "other", "bought", "All three have outgrown last year's.", {
            createdAt: at(-40, "09:00"),
            decidedAt: at(-38, "20:00"),
            boughtAt: at(-26, "15:00"),
            ledgerEntryId: coats.id,
            buyTaskId: "buy-7",
        }),
    ];

    const approvals: WishApproval[] = [
        { id: "app-1", spaceId: sid, wishId: "purchase-2", parentMemberId: ife.id, decision: "approve", comment: "Yes — and they can live in the studio drawer.", at: at(-5, "21:05") },
        { id: "app-2", spaceId: sid, wishId: "purchase-3", parentMemberId: ife.id, decision: "approve", comment: "She needs it. It comes out of the education line, not the fun one.", at: at(-1, "21:20") },
        { id: "app-3", spaceId: sid, wishId: "purchase-4", parentMemberId: tunde.id, decision: "defer", comment: "After the Lagos flights are paid for. November, unless it dies first.", at: at(-8, "22:10") },
        { id: "app-4", spaceId: sid, wishId: "purchase-5", parentMemberId: ife.id, decision: "approve", comment: "Lovely.", at: at(-13, "21:40") },
        { id: "app-5", spaceId: sid, wishId: "purchase-5", parentMemberId: tunde.id, decision: "approve", comment: "The week before, not the day before.", at: at(-13, "21:45") },
        { id: "app-6", spaceId: sid, wishId: "purchase-6", parentMemberId: tunde.id, decision: "decline", comment: "The dining table works for now.", at: at(-24, "20:00") },
        { id: "app-7", spaceId: sid, wishId: "purchase-7", parentMemberId: ife.id, decision: "approve", comment: "Before the cold comes.", at: at(-38, "19:50") },
        { id: "app-8", spaceId: sid, wishId: "purchase-7", parentMemberId: tunde.id, decision: "approve", comment: "Agreed.", at: at(-38, "20:00") },
    ];

    const buyTasks: BuyTask[] = [
        { id: "buy-2", spaceId: sid, wishId: "purchase-2", title: "Buy the good colouring pencils", assigneeMemberId: ife.id, dueDate: day(3), done: false, createdBy: ife.id, createdAt: at(-5, "21:05"), doneAt: null },
        { id: "buy-7", spaceId: sid, wishId: "purchase-7", title: "Buy winter coats for the three of them", assigneeMemberId: ife.id, dueDate: day(-30), done: true, createdBy: ife.id, createdAt: at(-38, "20:01"), doneAt: at(-26, "15:00") },
    ];

    // -----------------------------------------------------------------------
    // Dami's envelope and the family's pots
    // -----------------------------------------------------------------------
    const envelopes: Envelope[] = [
        {
            id: "env-dami",
            spaceId: sid,
            memberId: dami.id,
            monthlyAmountCents: 2500,
            balanceCents: 1100,
            grantedBy: ife.id,
            note: "£25 on the first of the month. Hers to spend, hers to explain.",
            lastToppedUp: M(0),
            createdAt: at(-210, "19:00"),
        },
    ];

    const savingsGoals: SavingsGoal[] = [
        {
            id: "fund-home-deposit",
            spaceId: sid,
            name: "Home deposit pot",
            goalId: "goal-2",
            goalLabel: "Save a deposit for a home of our own",
            targetCents: 3000000,
            currentCents: 1620000,
            accountId: "acc-savings",
            note: "10% on a three-bedroom within twenty minutes of Grace Chapel.",
            createdAt: at(-410, "20:10"),
        },
        { id: "fund-emergency", spaceId: sid, name: "Emergency fund", goalId: null, goalLabel: "", targetCents: 500000, currentCents: 390000, accountId: "acc-savings", note: "Three months of the fixed bills.", createdAt: at(-380, "20:10") },
        {
            id: "fund-lagos",
            spaceId: sid,
            name: "Christmas in Lagos",
            goalId: "goal-4",
            goalLabel: "Christmas in Lagos",
            targetCents: 250000,
            currentCents: 118000,
            accountId: "acc-savings",
            note: "Flights, the house and something for everybody.",
            createdAt: at(-200, "21:00"),
        },
    ];

    return {
        visible: true,
        accounts,
        budgets,
        entries: entries.sort((a, b) => b.date.localeCompare(a.date)),
        bills,
        billPayments,
        alerts,
        wishes,
        approvals,
        buyTasks,
        envelopes,
        savingsGoals,
        goalFunds: [],
        settings: {
            spaceId: sid,
            currency: cur,
            approvalThresholdCents: 30000,
            reauthMinutes: 15,
            reauthPin: "2009",
            fxRates: { [cur]: 1, NGN: 0.00048, USD: 0.79, EUR: 0.86 },
            tithePct: 10,
            note: "Anything over £300 needs both of us. The tithe comes off the top, before anything else is decided.",
        },
        summary: {
            month: M(0),
            label: "",
            incomeCents: 0,
            spentCents: 0,
            budgetCents: 0,
            leftCents: 0,
            savedCents: 0,
            givingCents: 0,
            givingPct: 0,
            categories: [],
        },
        mine: { wishes: [], envelope: null, envelopeEntries: [], canViewBudget: false },
    };
}

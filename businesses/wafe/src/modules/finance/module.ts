import { Wallet } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalFinanceRepo } from "./local";
import { SupabaseFinanceRepo } from "./supabase";
import type { FinanceRepo, FinanceState } from "./types";

/**
 * Household finances — what we earn, spend, give and save.
 *
 * The nav entry is parents-only (plus a teenager a parent has explicitly
 * granted `finance.view`, who gets a read-only budget overview and no ledger
 * at all). The one door a child has is `/live/finance/wish`: the wish form and
 * their own answers, which the child dashboard links to — the route is
 * registered for everyone precisely so that link survives a refresh.
 */
const finance: WafeModule<FinanceState, FinanceRepo> = {
    id: "finance",
    area: "live",
    name: "Household finances",
    nav: "Money",
    blurb: "Budgets, bills, the purchase pipeline and the giving record — with a wish form the children can use.",
    icon: Wallet,
    path: "/live/finance",
    visibleTo: ["finance.manage", "finance.view"],
    routes: [
        { path: "", lazy: () => import("./pages/FinancePage") },
        { path: "budgets", lazy: () => import("./pages/BudgetsPage") },
        { path: "ledger", lazy: () => import("./pages/LedgerPage") },
        { path: "bills", lazy: () => import("./pages/BillsPage") },
        { path: "purchases", lazy: () => import("./pages/PurchasesPage") },
        { path: "giving", lazy: () => import("./pages/GivingPage") },
        { path: "wish", lazy: () => import("./pages/WishPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseFinanceRepo(ctx) : new LocalFinanceRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default finance;

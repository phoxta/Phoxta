import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// Date-range reservations (migration 0028) — the core object for rental / stay /
// experience businesses. Owner-side view for the operating console.
export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";

/** Reservation metadata written by storefronts / the Paystack webhook. */
export type ReservationMeta = {
  paid?: boolean;
  payment_reference?: string;
  paid_at?: string;
  /** 'table' for restaurant table reservations (time + party, not a date range). */
  kind?: string;
  time?: string;
  extras?: { label?: string }[];
  driver?: { license?: string; age?: string };
};

export type Reservation = {
  id: string;
  product_id: string | null;
  product_name: string;
  customer_name: string;
  customer_email: string;
  start_date: string;
  end_date: string;
  units: number;
  total_cents: number;
  currency: string;
  status: ReservationStatus;
  notes: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export const reservationMeta = (r: Reservation): ReservationMeta => (r.metadata ?? {}) as ReservationMeta;
export const isReservationPaid = (r: Reservation): boolean => reservationMeta(r).paid === true;
export const isTableReservation = (r: Reservation): boolean => reservationMeta(r).kind === "table";

export async function listReservations(orgId: string): Promise<{ data: Reservation[]; error: string | null }> {
  const { data, error } = await supabase
    .from("reservations")
    .select("id, product_id, customer_name, customer_email, start_date, end_date, units, total_cents, currency, status, notes, metadata, created_at, products(name)")
    .eq("organization_id", orgId)
    .order("start_date", { ascending: true });
  const rows = ((data as Array<Record<string, any>> | null) ?? []).map((r) => ({
    ...r,
    product_name: r.products?.name ?? "—",
  }));
  return { data: rows as Reservation[], error: friendlyError(error?.message) };
}

export async function setReservationStatus(id: string, status: ReservationStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

// --- Guest notifications + refunds (edge functions) --------------------------
export type ReservationNotifyKind = "reservation_confirmed" | "reservation_cancelled";

/** Notify the guest by email via the commerce-notify edge function. */
export async function notifyReservationGuest(
  orgId: string,
  reservationId: string,
  kind: ReservationNotifyKind,
): Promise<{ delivery: "sent" | "no-email" | "failed" | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("commerce-notify", { body: { orgId, reservationId, kind } });
  if (error) return { delivery: null, error: friendlyError(error.message) };
  const body = (data ?? {}) as { ok?: boolean; delivery?: "sent" | "no-email" | "failed"; error?: string };
  if (body.error) return { delivery: null, error: String(body.error) };
  return { delivery: body.delivery ?? "failed", error: null };
}

/** Full refund of a paid reservation through Paystack. */
export async function refundReservationPaystack(
  orgId: string,
  reservationId: string,
): Promise<{ refunded_cents: number | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("paystack-refund", { body: { orgId, reservationId } });
  if (error) return { refunded_cents: null, error: friendlyError(error.message) };
  const body = (data ?? {}) as { ok?: boolean; refunded_cents?: number; error?: string };
  if (body.error) return { refunded_cents: null, error: String(body.error) };
  return { refunded_cents: typeof body.refunded_cents === "number" ? body.refunded_cents : null, error: null };
}

/** Pending/confirmed reservations for a product that overlap [start, end] (inclusive). */
export async function countOverlappingReservations(
  orgId: string,
  productId: string,
  startDate: string,
  endDate: string,
): Promise<{ count: number; error: string | null }> {
  const { count, error } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("product_id", productId)
    .in("status", ["pending", "confirmed"])
    .lte("start_date", endDate)
    .gte("end_date", startDate);
  return { count: count ?? 0, error: friendlyError(error?.message) };
}

// --- Availability blackouts (owner-set unavailable periods per resource) -----
export type Blackout = {
  id: string;
  product_id: string;
  product_name: string;
  start_date: string;
  end_date: string;
  reason: string;
};

export async function listBlackouts(orgId: string): Promise<{ data: Blackout[]; error: string | null }> {
  const { data, error } = await supabase
    .from("resource_blackouts")
    .select("id, product_id, start_date, end_date, reason, products(name)")
    .eq("organization_id", orgId)
    .order("start_date", { ascending: true });
  const rows = ((data as Array<Record<string, any>> | null) ?? []).map((r) => ({ ...r, product_name: r.products?.name ?? "—" }));
  return { data: rows as Blackout[], error: friendlyError(error?.message) };
}

export async function createBlackout(
  orgId: string,
  input: { product_id: string; start_date: string; end_date: string; reason: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("resource_blackouts").insert({ organization_id: orgId, ...input });
  return { error: friendlyError(error?.message) };
}

export async function removeBlackout(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("resource_blackouts").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

// --- Per-day availability (for the calendar) — factors stock, bookings, blackouts.
export type AvailDay = { day: string; units_total: number; units_booked: number; available: number };

export async function resourceAvailability(productId: string, from: string, to: string): Promise<AvailDay[]> {
  const { data, error } = await supabase.rpc("app_resource_availability", { p_product: productId, p_from: from, p_to: to });
  if (error) return [];
  return (data as AvailDay[] | null) ?? [];
}

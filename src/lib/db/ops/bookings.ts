import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

// --- Bookable services -----------------------------------------------------
export type Service = {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price_cents: number;
  currency: string;
  active: boolean;
  created_at: string;
};

export async function listServices(orgId: string): Promise<{ data: Service[]; error: string | null }> {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, duration_min, price_cents, currency, active, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return { data: (data as Service[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createService(
  orgId: string,
  input: { name: string; duration_min: number; price_cents: number },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("services").insert({
    organization_id: orgId,
    name: input.name.trim(),
    duration_min: input.duration_min,
    price_cents: input.price_cents,
  });
  return { error: friendlyError(error?.message) };
}

export async function updateService(
  id: string,
  input: { name: string; duration_min: number; price_cents: number },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("services")
    .update({ name: input.name.trim(), duration_min: input.duration_min, price_cents: input.price_cents })
    .eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function deleteService(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("services").delete().eq("id", id);
  return { error: friendlyError(error?.message) };
}

export async function toggleService(id: string, active: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from("services").update({ active }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

// --- Bookings --------------------------------------------------------------
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type Booking = {
  id: string;
  service_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  start_at: string;
  status: BookingStatus;
  notes: string;
  services: { name: string } | null;
};

export async function listBookings(orgId: string): Promise<{ data: Booking[]; error: string | null }> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, service_id, customer_name, customer_email, customer_phone, start_at, status, notes, services(name)")
    .eq("organization_id", orgId)
    .order("start_at", { ascending: true });
  return { data: (data as unknown as Booking[] | null) ?? [], error: friendlyError(error?.message) };
}

/**
 * Create a booking. If a service is chosen, first re-checks (against fresh
 * data at submit time) that no pending/confirmed booking for the same service
 * starts within the service's duration window — an advisory conflict guard.
 */
export async function createBooking(
  orgId: string,
  input: {
    service_id?: string | null;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    start_at: string;
    notes?: string;
  },
): Promise<{ error: string | null }> {
  if (input.service_id) {
    const { data: svc, error: svcErr } = await supabase
      .from("services")
      .select("name, duration_min")
      .eq("id", input.service_id)
      .maybeSingle();
    if (svcErr) return { error: friendlyError(svcErr.message) };
    const durationMin = Math.max(1, (svc as { duration_min?: number } | null)?.duration_min || 30);
    const startMs = new Date(input.start_at).getTime();
    if (Number.isFinite(startMs)) {
      const windowStart = new Date(startMs - durationMin * 60000).toISOString();
      const windowEnd = new Date(startMs + durationMin * 60000).toISOString();
      const { data: clash, error: clashErr } = await supabase
        .from("bookings")
        .select("id, customer_name, start_at")
        .eq("organization_id", orgId)
        .eq("service_id", input.service_id)
        .in("status", ["pending", "confirmed"])
        .gt("start_at", windowStart)
        .lt("start_at", windowEnd)
        .limit(1);
      if (clashErr) return { error: friendlyError(clashErr.message) };
      const hit = (clash as { customer_name: string; start_at: string }[] | null)?.[0];
      if (hit) {
        const when = new Date(hit.start_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
        return {
          error: `That slot conflicts with ${hit.customer_name || "another customer"}'s ${
            (svc as { name?: string } | null)?.name || "booking"
          } at ${when}. Pick a different time.`,
        };
      }
    }
  }
  const { error } = await supabase.from("bookings").insert({
    organization_id: orgId,
    service_id: input.service_id || null,
    customer_name: input.customer_name.trim(),
    customer_email: input.customer_email?.trim() ?? "",
    customer_phone: input.customer_phone?.trim() ?? "",
    start_at: input.start_at,
    notes: input.notes ?? "",
    status: "pending",
  });
  return { error: friendlyError(error?.message) };
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

// --- Customer notification (commerce-notify edge fn) -----------------------
export type NotifyDelivery = "sent" | "no-email" | "failed";

export async function notifyBookingStatus(
  orgId: string,
  bookingId: string,
  kind: "booking_confirmed" | "booking_cancelled",
): Promise<{ delivery: NotifyDelivery | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("commerce-notify", {
    body: { orgId, bookingId, kind },
  });
  if (error) return { delivery: null, error: friendlyError(error.message) };
  const res = data as { ok?: boolean; delivery?: NotifyDelivery; error?: string } | null;
  if (!res?.ok) return { delivery: null, error: res?.error || "Notification failed." };
  return { delivery: res.delivery ?? null, error: null };
}

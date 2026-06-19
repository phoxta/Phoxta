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

export async function toggleService(id: string, active: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from("services").update({ active }).eq("id", id);
  return { error: friendlyError(error?.message) };
}

// --- Bookings --------------------------------------------------------------
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type Booking = {
  id: string;
  service_id: string | null;
  customer_name: string;
  customer_email: string;
  start_at: string;
  status: BookingStatus;
  notes: string;
  services: { name: string } | null;
};

export async function listBookings(orgId: string): Promise<{ data: Booking[]; error: string | null }> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, service_id, customer_name, customer_email, start_at, status, notes, services(name)")
    .eq("organization_id", orgId)
    .order("start_at", { ascending: true });
  return { data: (data as unknown as Booking[] | null) ?? [], error: friendlyError(error?.message) };
}

export async function createBooking(
  orgId: string,
  input: { service_id?: string | null; customer_name: string; customer_email?: string; start_at: string; notes?: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("bookings").insert({
    organization_id: orgId,
    service_id: input.service_id || null,
    customer_name: input.customer_name.trim(),
    customer_email: input.customer_email?.trim() ?? "",
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

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import rawCars from "@/util/cars.json";
import { resolveTenant, fetchFleet, type Car, type BusinessProfile } from "@/lib/phoxta";

// Live, per-tenant fleet. On load it resolves which car-rental business this
// storefront serves (by hostname) and fetches that org's vehicles from the Phoxta
// backend — the SAME products the owner manages in the operating console. Falls
// back to the bundled demo fleet when unconfigured (local dev) or empty, so the
// store always renders. Also brands the browser tab with the tenant's name.

const STATIC_FLEET: Car[] = (rawCars as Array<Record<string, unknown>>).map((c) => ({
  id: String(c.id),
  name: c.name as string,
  price: Number(c.price),
  duration: String(c.duration),
  carType: c.carType as string,
  amenities: c.amenities as string,
  rating: parseFloat(c.rating as string) || 4.5,
  fuelType: c.fuelType as string,
  location: c.location as string,
  image: c.image as string,
}));

type FleetCtx = { cars: Car[]; loading: boolean; orgId: string | null; live: boolean; profile: BusinessProfile | null };
const Ctx = createContext<FleetCtx>({ cars: STATIC_FLEET, loading: true, orgId: null, live: false, profile: null });

export function FleetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FleetCtx>({ cars: STATIC_FLEET, loading: true, orgId: null, live: false, profile: null });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const tenant = await resolveTenant();
        if (!tenant) {
          if (active) setState({ cars: STATIC_FLEET, loading: false, orgId: null, live: false, profile: null });
          return;
        }
        if (tenant.name) document.title = tenant.name;
        const fleet = await fetchFleet(tenant.id);
        if (!active) return;
        setState({ cars: fleet.length ? fleet : STATIC_FLEET, loading: false, orgId: tenant.id, live: fleet.length > 0, profile: tenant.profile ?? null });
      } catch {
        if (active) setState({ cars: STATIC_FLEET, loading: false, orgId: null, live: false, profile: null });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useFleet(): FleetCtx {
  return useContext(Ctx);
}

/** Look up one vehicle by id (uuid for live, numeric string for the demo fallback). */
export function useCar(id?: string | null): Car | undefined {
  const { cars } = useFleet();
  if (!id) return cars[0];
  return cars.find((c) => String(c.id) === String(id)) ?? cars[0];
}

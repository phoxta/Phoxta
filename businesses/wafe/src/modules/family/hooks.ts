import { useModule } from "@/state/data";
import familyModule from "./module";
import type { FamilyRepo, FamilyState } from "./types";

/** The module's own typed slice, in one import for every screen here. */
export const useFamily = () => useModule<FamilyState, FamilyRepo>(familyModule);

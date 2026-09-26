import cafe from "./cafe.json";
import retail from "./retail.json";
import salon from "./salon.json";

export const businessProfiles = { retail, cafe, salon } as const;
export type BusinessProfileId = keyof typeof businessProfiles;

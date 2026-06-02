import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { appSettings } from "../db/schema.js";

export const BRANDING_SETTINGS_KEY = "branding";

export interface BrandingSettingsDTO {
  logo_data_url: string | null;
}

function toBrandingSettings(value: Record<string, unknown> | null | undefined): BrandingSettingsDTO {
  const logo = value?.logo_data_url;
  return {
    logo_data_url: typeof logo === "string" && logo.length > 0 ? logo : null,
  };
}

export async function getBrandingSettings(): Promise<BrandingSettingsDTO> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, BRANDING_SETTINGS_KEY))
    .limit(1);
  return toBrandingSettings(row?.value);
}

export async function setBrandingSettings(input: BrandingSettingsDTO): Promise<BrandingSettingsDTO> {
  const value = { logo_data_url: input.logo_data_url };
  const [row] = await db
    .insert(appSettings)
    .values({
      key: BRANDING_SETTINGS_KEY,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    })
    .returning({ value: appSettings.value });
  return toBrandingSettings(row?.value);
}

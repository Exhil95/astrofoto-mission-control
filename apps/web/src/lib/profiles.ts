import type { SessionSettings } from "./session";

export type EquipmentProfile = {
  id: number;
  name: string;
  siteName: string;
  latitudeDeg: number;
  longitudeDeg: number;
  timezone: string;
  bortle: number;
  telescopeName: string;
  focalLengthMm: number;
  reducer: number;
  sensorId: string;
  sensorName: string;
  sensorWidthMm: number;
  sensorHeightMm: number;
  pixelSizeUm: number;
  updatedAt: string;
};

export type ProfilePayload = Omit<EquipmentProfile, "id" | "updatedAt">;

type ApiProfile = {
  id: number;
  name: string;
  site_name: string;
  latitude_deg: number;
  longitude_deg: number;
  timezone: string;
  bortle: number;
  telescope_name: string;
  focal_length_mm: number;
  reducer: number;
  sensor_id: string;
  sensor_name: string;
  sensor_width_mm: number;
  sensor_height_mm: number;
  pixel_size_um: number;
  updated_at: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchProfiles(): Promise<EquipmentProfile[]> {
  const response = await fetch(`${apiBaseUrl}/api/profiles`);
  if (!response.ok) throw new Error(`Profile list failed with ${response.status}`);
  return ((await response.json()) as ApiProfile[]).map(normalizeProfile);
}

export async function createProfile(payload: ProfilePayload): Promise<EquipmentProfile> {
  const response = await fetch(`${apiBaseUrl}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApiPayload(payload))
  });
  if (!response.ok) throw new Error(`Profile create failed with ${response.status}`);
  return normalizeProfile((await response.json()) as ApiProfile);
}

export async function updateProfile(
  profileId: number,
  payload: ProfilePayload
): Promise<EquipmentProfile> {
  const response = await fetch(`${apiBaseUrl}/api/profiles/${profileId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApiPayload(payload))
  });
  if (!response.ok) throw new Error(`Profile update failed with ${response.status}`);
  return normalizeProfile((await response.json()) as ApiProfile);
}

export async function deleteProfile(profileId: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/profiles/${profileId}`, {
    method: "DELETE"
  });
  if (!response.ok) throw new Error(`Profile delete failed with ${response.status}`);
}

export function createFallbackProfiles(): EquipmentProfile[] {
  return [
    {
      id: 1,
      name: "Backyard APS-C",
      siteName: "Katowice",
      latitudeDeg: 50.2649,
      longitudeDeg: 19.0238,
      timezone: "Europe/Warsaw",
      bortle: 5,
      telescopeName: "80ED Refractor",
      focalLengthMm: 480,
      reducer: 1,
      sensorId: "imx571",
      sensorName: "Sony IMX571",
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
      pixelSizeUm: 3.76,
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      name: "Dark Site Wide",
      siteName: "Bieszczady",
      latitudeDeg: 49.2486,
      longitudeDeg: 22.5937,
      timezone: "Europe/Warsaw",
      bortle: 2,
      telescopeName: "RedCat Class",
      focalLengthMm: 250,
      reducer: 1,
      sensorId: "imx571",
      sensorName: "Sony IMX571",
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
      pixelSizeUm: 3.76,
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      name: "Tenerife Full Frame",
      siteName: "Tenerife",
      latitudeDeg: 28.3003,
      longitudeDeg: -16.5118,
      timezone: "Atlantic/Canary",
      bortle: 3,
      telescopeName: "Fast Astrograph",
      focalLengthMm: 420,
      reducer: 0.8,
      sensorId: "imx455",
      sensorName: "Sony IMX455",
      sensorWidthMm: 36,
      sensorHeightMm: 24,
      pixelSizeUm: 3.76,
      updatedAt: new Date().toISOString()
    }
  ];
}

export function profileToSessionSettings(profile: EquipmentProfile, date: string): SessionSettings {
  return {
    date,
    latitudeDeg: profile.latitudeDeg,
    longitudeDeg: profile.longitudeDeg,
    timezone: profile.timezone,
    bortle: profile.bortle
  };
}

export function normalizeProfile(profile: ApiProfile): EquipmentProfile {
  return {
    id: profile.id,
    name: profile.name,
    siteName: profile.site_name,
    latitudeDeg: profile.latitude_deg,
    longitudeDeg: profile.longitude_deg,
    timezone: profile.timezone,
    bortle: profile.bortle,
    telescopeName: profile.telescope_name,
    focalLengthMm: profile.focal_length_mm,
    reducer: profile.reducer,
    sensorId: profile.sensor_id,
    sensorName: profile.sensor_name,
    sensorWidthMm: profile.sensor_width_mm,
    sensorHeightMm: profile.sensor_height_mm,
    pixelSizeUm: profile.pixel_size_um,
    updatedAt: profile.updated_at
  };
}

export function profileToPayload(profile: EquipmentProfile): ProfilePayload {
  return {
    name: profile.name,
    siteName: profile.siteName,
    latitudeDeg: profile.latitudeDeg,
    longitudeDeg: profile.longitudeDeg,
    timezone: profile.timezone,
    bortle: profile.bortle,
    telescopeName: profile.telescopeName,
    focalLengthMm: profile.focalLengthMm,
    reducer: profile.reducer,
    sensorId: profile.sensorId,
    sensorName: profile.sensorName,
    sensorWidthMm: profile.sensorWidthMm,
    sensorHeightMm: profile.sensorHeightMm,
    pixelSizeUm: profile.pixelSizeUm
  };
}

function toApiPayload(profile: ProfilePayload) {
  return {
    name: profile.name,
    site_name: profile.siteName,
    latitude_deg: profile.latitudeDeg,
    longitude_deg: profile.longitudeDeg,
    timezone: profile.timezone,
    bortle: profile.bortle,
    telescope_name: profile.telescopeName,
    focal_length_mm: profile.focalLengthMm,
    reducer: profile.reducer,
    sensor_id: profile.sensorId,
    sensor_name: profile.sensorName,
    sensor_width_mm: profile.sensorWidthMm,
    sensor_height_mm: profile.sensorHeightMm,
    pixel_size_um: profile.pixelSizeUm
  };
}

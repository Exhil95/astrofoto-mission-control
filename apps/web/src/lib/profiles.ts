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
  telescopeType: string;
  apertureMm: number;
  focalLengthMm: number;
  reducerName: string;
  reducer: number;
  cameraName: string;
  sensorId: string;
  sensorName: string;
  sensorWidthMm: number;
  sensorHeightMm: number;
  pixelSizeUm: number;
  filterSet: string;
  filterWheel: string;
  guidingSetup: string;
  guideCameraName: string;
  focuserName: string;
  mountName: string;
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
  telescope_type?: string;
  aperture_mm?: number;
  focal_length_mm: number;
  reducer_name?: string;
  reducer: number;
  camera_name?: string;
  sensor_id: string;
  sensor_name: string;
  sensor_width_mm: number;
  sensor_height_mm: number;
  pixel_size_um: number;
  filter_set?: string;
  filter_wheel?: string;
  guiding_setup?: string;
  guide_camera_name?: string;
  focuser_name?: string;
  mount_name?: string;
  updated_at: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchProfiles(authToken?: string): Promise<EquipmentProfile[]> {
  const response = await fetch(`${apiBaseUrl}/api/profiles`, {
    headers: authHeaders(authToken)
  });
  if (!response.ok) throw new Error(`Profile list failed with ${response.status}`);
  return ((await response.json()) as ApiProfile[]).map(normalizeProfile);
}

export async function createProfile(
  payload: ProfilePayload,
  authToken?: string
): Promise<EquipmentProfile> {
  const response = await fetch(`${apiBaseUrl}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(authToken) },
    body: JSON.stringify(toApiPayload(payload))
  });
  if (!response.ok) throw new Error(`Profile create failed with ${response.status}`);
  return normalizeProfile((await response.json()) as ApiProfile);
}

export async function updateProfile(
  profileId: number,
  payload: ProfilePayload,
  authToken?: string
): Promise<EquipmentProfile> {
  const response = await fetch(`${apiBaseUrl}/api/profiles/${profileId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(authToken) },
    body: JSON.stringify(toApiPayload(payload))
  });
  if (!response.ok) throw new Error(`Profile update failed with ${response.status}`);
  return normalizeProfile((await response.json()) as ApiProfile);
}

export async function deleteProfile(profileId: number, authToken?: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/profiles/${profileId}`, {
    method: "DELETE",
    headers: authHeaders(authToken)
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
      telescopeType: "Doublet refractor",
      apertureMm: 80,
      focalLengthMm: 480,
      reducerName: "1.0x field flattener",
      reducer: 1,
      cameraName: "ASI2600MC Pro",
      sensorId: "imx571",
      sensorName: "Sony IMX571",
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
      pixelSizeUm: 3.76,
      filterSet: "UV/IR cut + dual narrowband",
      filterWheel: "2 inch filter drawer",
      guidingSetup: "50mm guide scope",
      guideCameraName: "ASI120MM Mini",
      focuserName: "EAF on Crayford",
      mountName: "HEQ5 class",
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
      telescopeType: "Petzval refractor",
      apertureMm: 51,
      focalLengthMm: 250,
      reducerName: "Native flat field",
      reducer: 1,
      cameraName: "ASI2600MC Pro",
      sensorId: "imx571",
      sensorName: "Sony IMX571",
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.7,
      pixelSizeUm: 3.76,
      filterSet: "UV/IR cut + L-eXtreme",
      filterWheel: "Filter drawer",
      guidingSetup: "30mm mini guide scope",
      guideCameraName: "ASI120MM Mini",
      focuserName: "Helical focuser",
      mountName: "Travel harmonic mount",
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
      telescopeType: "Corrected astrograph",
      apertureMm: 150,
      focalLengthMm: 420,
      reducerName: "0.8x reducer/corrector",
      reducer: 0.8,
      cameraName: "ASI6200MM Pro",
      sensorId: "imx455",
      sensorName: "Sony IMX455",
      sensorWidthMm: 36,
      sensorHeightMm: 24,
      pixelSizeUm: 3.76,
      filterSet: "LRGB + 3nm SHO",
      filterWheel: "7x2 inch EFW",
      guidingSetup: "OAG",
      guideCameraName: "ASI174MM Mini",
      focuserName: "High-torque EAF",
      mountName: "EQ8 class",
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
    telescopeType: profile.telescope_type ?? "Refractor",
    apertureMm: profile.aperture_mm ?? 80,
    focalLengthMm: profile.focal_length_mm,
    reducerName: profile.reducer_name ?? "None",
    reducer: profile.reducer,
    cameraName: profile.camera_name ?? "Dedicated astro camera",
    sensorId: profile.sensor_id,
    sensorName: profile.sensor_name,
    sensorWidthMm: profile.sensor_width_mm,
    sensorHeightMm: profile.sensor_height_mm,
    pixelSizeUm: profile.pixel_size_um,
    filterSet: profile.filter_set ?? "LRGB + Ha/OIII/SII",
    filterWheel: profile.filter_wheel ?? "Manual drawer",
    guidingSetup: profile.guiding_setup ?? "50mm guide scope",
    guideCameraName: profile.guide_camera_name ?? "ASI120MM class",
    focuserName: profile.focuser_name ?? "Manual focuser",
    mountName: profile.mount_name ?? "Equatorial mount",
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
    telescopeType: profile.telescopeType,
    apertureMm: profile.apertureMm,
    focalLengthMm: profile.focalLengthMm,
    reducerName: profile.reducerName,
    reducer: profile.reducer,
    cameraName: profile.cameraName,
    sensorId: profile.sensorId,
    sensorName: profile.sensorName,
    sensorWidthMm: profile.sensorWidthMm,
    sensorHeightMm: profile.sensorHeightMm,
    pixelSizeUm: profile.pixelSizeUm,
    filterSet: profile.filterSet,
    filterWheel: profile.filterWheel,
    guidingSetup: profile.guidingSetup,
    guideCameraName: profile.guideCameraName,
    focuserName: profile.focuserName,
    mountName: profile.mountName
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
    telescope_type: profile.telescopeType,
    aperture_mm: profile.apertureMm,
    focal_length_mm: profile.focalLengthMm,
    reducer_name: profile.reducerName,
    reducer: profile.reducer,
    camera_name: profile.cameraName,
    sensor_id: profile.sensorId,
    sensor_name: profile.sensorName,
    sensor_width_mm: profile.sensorWidthMm,
    sensor_height_mm: profile.sensorHeightMm,
    pixel_size_um: profile.pixelSizeUm,
    filter_set: profile.filterSet,
    filter_wheel: profile.filterWheel,
    guiding_setup: profile.guidingSetup,
    guide_camera_name: profile.guideCameraName,
    focuser_name: profile.focuserName,
    mount_name: profile.mountName
  };
}

function authHeaders(authToken?: string): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

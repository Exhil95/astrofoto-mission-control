import type { SessionSettings } from "./session";

export type ForecastStatus = "shoot" | "risk" | "skip";

export type SkyForecastHour = {
  time: string;
  cloudCoverPercent: number;
  cloudLowPercent: number;
  cloudMidPercent: number;
  cloudHighPercent: number;
  humidityPercent: number;
  temperatureC: number;
  dewPointC: number;
  windSpeedKmh: number;
  windGustKmh: number;
  visibilityKm: number;
  precipitationProbabilityPercent: number;
  imagingScore: number;
  risk: ForecastStatus;
};

export type SkyForecast = {
  source: string;
  status: ForecastStatus;
  score: number;
  summary: string;
  updatedAt: string;
  warnings: string[];
  hours: SkyForecastHour[];
};

type ApiSkyForecast = {
  source: string;
  status: ForecastStatus;
  score: number;
  summary: string;
  updated_at: string;
  warnings: string[];
  hours: {
    time: string;
    cloud_cover_percent: number;
    cloud_low_percent: number;
    cloud_mid_percent: number;
    cloud_high_percent: number;
    humidity_percent: number;
    temperature_c: number;
    dew_point_c: number;
    wind_speed_kmh: number;
    wind_gust_kmh: number;
    visibility_km: number;
    precipitation_probability_percent: number;
    imaging_score: number;
    risk: ForecastStatus;
  }[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchSkyForecast(settings: SessionSettings): Promise<SkyForecast> {
  const response = await fetch(`${apiBaseUrl}/api/forecast/sky`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: settings.date,
      latitude_deg: settings.latitudeDeg,
      longitude_deg: settings.longitudeDeg,
      timezone: settings.timezone
    })
  });

  if (!response.ok) {
    throw new Error(`Sky forecast failed with ${response.status}`);
  }

  return normalizeSkyForecast((await response.json()) as ApiSkyForecast);
}

export function createFallbackSkyForecast(settings?: SessionSettings): SkyForecast {
  const hours = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00"];
  const seed = settings ? Math.round(Math.abs(settings.latitudeDeg) * 3 + Math.abs(settings.longitudeDeg) * 5) : 17;
  const forecastHours = hours.map((time, index) => {
    const wave = (Math.sin(index * 0.82 + seed) + 1) / 2;
    const cloud = Math.round(22 + wave * 46);
    const humidity = Math.round(62 + wave * 22);
    const wind = Number((6 + wave * 11).toFixed(1));
    const gust = Number((wind + 6 + wave * 7).toFixed(1));
    const temperature = Number((14 - index * 0.35).toFixed(1));
    const dewPoint = Number((temperature - Math.max(1.4, 7 - humidity * 0.06)).toFixed(1));
    const score = Math.max(10, Math.min(100, Math.round(96 - cloud * 0.7 - Math.max(0, humidity - 82) * 0.8 - Math.max(0, gust - 28))));

    return {
      time,
      cloudCoverPercent: cloud,
      cloudLowPercent: Math.round(cloud * 0.35),
      cloudMidPercent: Math.round(cloud * 0.52),
      cloudHighPercent: Math.round(cloud * 0.68),
      humidityPercent: humidity,
      temperatureC: temperature,
      dewPointC: dewPoint,
      windSpeedKmh: wind,
      windGustKmh: gust,
      visibilityKm: Number(Math.max(6, 24 - cloud * 0.14).toFixed(1)),
      precipitationProbabilityPercent: Math.max(2, Math.round(cloud * 0.28 - 4)),
      imagingScore: score,
      risk: statusFromScore(score)
    };
  });
  const score = Math.round(
    forecastHours.reduce((total, hour) => total + hour.imagingScore, 0) / forecastHours.length
  );

  return {
    source: "offline",
    status: statusFromScore(score),
    score,
    summary: score >= 72 ? "Offline clear estimate" : score >= 45 ? "Offline weather estimate" : "Offline risk estimate",
    updatedAt: new Date().toISOString(),
    warnings: ["Forecast provider unavailable"],
    hours: forecastHours
  };
}

function normalizeSkyForecast(forecast: ApiSkyForecast): SkyForecast {
  return {
    source: forecast.source,
    status: forecast.status,
    score: forecast.score,
    summary: forecast.summary,
    updatedAt: forecast.updated_at,
    warnings: forecast.warnings,
    hours: forecast.hours.map((hour) => ({
      time: hour.time,
      cloudCoverPercent: hour.cloud_cover_percent,
      cloudLowPercent: hour.cloud_low_percent,
      cloudMidPercent: hour.cloud_mid_percent,
      cloudHighPercent: hour.cloud_high_percent,
      humidityPercent: hour.humidity_percent,
      temperatureC: hour.temperature_c,
      dewPointC: hour.dew_point_c,
      windSpeedKmh: hour.wind_speed_kmh,
      windGustKmh: hour.wind_gust_kmh,
      visibilityKm: hour.visibility_km,
      precipitationProbabilityPercent: hour.precipitation_probability_percent,
      imagingScore: hour.imaging_score,
      risk: hour.risk
    }))
  };
}

function statusFromScore(score: number): ForecastStatus {
  if (score >= 72) return "shoot";
  if (score >= 45) return "risk";
  return "skip";
}

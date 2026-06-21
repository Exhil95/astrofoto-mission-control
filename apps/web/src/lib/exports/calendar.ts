import type { FovResult } from "../fov";
import { translateKnownText, type SupportedLanguage } from "../i18n";
import type { EquipmentProfile } from "../profiles";
import type { MultiSessionPlanItem, SessionSettings } from "../session";
import { moonLabel, scoreLabel, weatherLabel } from "./markdown";

export function createMultiSessionCalendar({
  items,
  selectedProfile,
  settings,
  fov,
  language
}: {
  items: MultiSessionPlanItem[];
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
  language: SupportedLanguage;
}) {
  const timezone = settings.timezone || "Europe/Warsaw";
  const createdAt = toIcsUtc(new Date());
  const events = items.map((item) =>
    [
      "BEGIN:VEVENT",
      `UID:${icsSafeId(`${item.date}-${item.targetId}`)}@astrofoto-mission-control`,
      `DTSTAMP:${createdAt}`,
      `DTSTART;TZID=${timezone}:${toIcsLocal(item.date, item.startTime)}`,
      `DTEND;TZID=${timezone}:${toIcsLocal(eventEndDate(item.date, item.startTime, item.endTime), item.endTime)}`,
      `SUMMARY:${escapeIcsText(`${item.targetName} - ${translateKnownText(language, item.recommendedMode)}`)}`,
      `LOCATION:${escapeIcsText(selectedProfile?.siteName ?? timezone)}`,
      `DESCRIPTION:${escapeIcsText(
        [
          translateKnownText(language, item.reason),
          `${scoreLabel(language)} ${item.score}/100`,
          `${weatherLabel(language)} ${item.weatherScore}/100`,
          `${moonLabel(language)} ${item.moonIlluminationPercent}%`,
          `FOV ${fov.horizontalDeg.toFixed(2)} x ${fov.verticalDeg.toFixed(2)} deg`,
          item.whiteNight ? translateKnownText(language, "White night") : translateKnownText(language, "Darkness available")
        ].join("\n")
      )}`,
      "END:VEVENT"
    ].join("\r\n")
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Astrofoto Mission Control//Multi-session Planner//${language.toUpperCase()}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarNameLabel(language))}`,
    `X-WR-TIMEZONE:${timezone}`,
    ...events,
    "END:VCALENDAR"
  ].join("\r\n");
}

function calendarNameLabel(language: SupportedLanguage) {
  return {
    en: "Astrofoto Mission Plan",
    pl: "Plan misji astrofoto",
    de: "Astrofoto-Missionsplan",
    it: "Piano missione astrofoto",
    es: "Plan de mision astrofoto"
  }[language];
}

function eventEndDate(dateIso: string, startTime: string, endTime: string) {
  return timeToMinutes(endTime) <= timeToMinutes(startTime) ? addDaysIso(dateIso, 1) : dateIso;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}

function addDaysIso(dateIso: string, days: number) {
  const nextDate = new Date(`${dateIso}T12:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function toIcsLocal(dateIso: string, time: string) {
  const [hours, minutes] = time.split(":");
  return `${dateIso.replace(/-/g, "")}T${hours.padStart(2, "0")}${minutes.padStart(2, "0")}00`;
}

function toIcsUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icsSafeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

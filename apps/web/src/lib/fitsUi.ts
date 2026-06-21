import { translations, type SupportedLanguage } from "./i18n";

type FitsIngestText = (typeof translations)[SupportedLanguage]["fitsIngest"];

export function importLabel(state: "idle" | "saving" | "saved" | "failed", text: FitsIngestText) {
  if (state === "saving") return text.saving;
  if (state === "saved") return text.saved;
  if (state === "failed") return text.retry;
  return text.import;
}

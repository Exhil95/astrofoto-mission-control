import {
  Check,
  Copy,
  Database,
  MapPinned,
  Pencil,
  Save,
  Telescope,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { translations, type SupportedLanguage } from "../lib/i18n";
import { profileToPayload, type EquipmentProfile, type ProfilePayload } from "../lib/profiles";
import { sensorPresets } from "../lib/sensors";

type ProfileDockProps = {
  profiles: EquipmentProfile[];
  selectedProfileId: number | null;
  busy: boolean;
  language: SupportedLanguage;
  onSelectProfile: (profileId: number) => void;
  onSaveCurrent: () => Promise<void> | void;
  onUpdateProfile: (profileId: number, payload: ProfilePayload) => Promise<void> | void;
  onDuplicateProfile: (profileId: number) => Promise<void> | void;
  onDeleteProfile: (profileId: number) => Promise<void> | void;
};

export function ProfileDock({
  profiles,
  selectedProfileId,
  busy,
  language,
  onSelectProfile,
  onSaveCurrent,
  onUpdateProfile,
  onDuplicateProfile,
  onDeleteProfile
}: ProfileDockProps) {
  const text = translations[language].profileDock;
  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0];
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<ProfilePayload>(() =>
    selectedProfile ? profileToPayload(selectedProfile) : createEmptyDraft()
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedProfile) setDraft(profileToPayload(selectedProfile));
    setError("");
  }, [selectedProfile?.id]);

  const sensorSelectValue = useMemo(() => {
    return sensorPresets.some((sensor) => sensor.id === draft.sensorId) ? draft.sensorId : "custom";
  }, [draft.sensorId]);

  const openEditor = () => {
    if (!selectedProfile) return;
    setDraft(profileToPayload(selectedProfile));
    setError("");
    setEditorOpen(true);
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProfile) return;

    const payload = sanitizeDraft(draft);
    if (!payload.name || !payload.siteName || !payload.timezone || !payload.telescopeName) {
      setError(text.completeRequired);
      return;
    }

    setError("");
    await onUpdateProfile(selectedProfile.id, payload);
    setEditorOpen(false);
  };

  const requestDelete = async () => {
    if (!selectedProfile || profiles.length <= 1) return;
    const confirmed = window.confirm(`${text.deleteConfirm} "${selectedProfile.name}"?`);
    if (confirmed) await onDeleteProfile(selectedProfile.id);
  };

  const updateDraft = <Key extends keyof ProfilePayload>(field: Key, value: ProfilePayload[Key]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const updateDraftNumber = (field: NumericProfileField, value: string) => {
    const numberValue = Number(value);
    updateDraft(field, (Number.isFinite(numberValue) ? numberValue : 0) as ProfilePayload[typeof field]);
  };

  const selectSensor = (sensorId: string) => {
    if (sensorId === "custom") {
      setDraft((current) => ({
        ...current,
        sensorId: "custom",
        sensorName: current.sensorName || "Custom sensor"
      }));
      return;
    }

    const sensor = sensorPresets.find((preset) => preset.id === sensorId);
    if (!sensor) return;
    setDraft((current) => ({
      ...current,
      sensorId: sensor.id,
      sensorName: sensor.name,
      sensorWidthMm: sensor.sensorWidthMm,
      sensorHeightMm: sensor.sensorHeightMm,
      pixelSizeUm: sensor.pixelSizeUm
    }));
  };

  return (
    <div className="stack profile-dock">
      <div className="section-title">
        <span>{text.profile}</span>
        <strong>{profiles.length}</strong>
      </div>

      <label className="field-row">
        <span>
          <Database size={15} aria-hidden="true" />
          {text.equipmentSite}
        </span>
        <select
          value={selectedProfile?.id ?? ""}
          onChange={(event) => {
            const profileId = Number(event.target.value);
            if (Number.isFinite(profileId)) onSelectProfile(profileId);
          }}
        >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} - {profile.siteName}
            </option>
          ))}
        </select>
      </label>

      {selectedProfile && (
        <>
          <div className="profile-card">
            <span>
              {selectedProfile.siteName} / {selectedProfile.mountName}
            </span>
            <strong>{selectedProfile.name}</strong>
            <em>
              {selectedProfile.telescopeName} / {selectedProfile.cameraName}
            </em>
          </div>

          <div className="profile-metrics">
            <div>
              <span>
                <MapPinned size={14} aria-hidden="true" />
                Bortle
              </span>
              <strong>{selectedProfile.bortle}</strong>
            </div>
            <div>
              <span>
                <Telescope size={14} aria-hidden="true" />
                {text.focal}
              </span>
              <strong>{selectedProfile.focalLengthMm.toFixed(0)}mm</strong>
            </div>
            <div>
              <span>{text.aperture}</span>
              <strong>{selectedProfile.apertureMm.toFixed(0)}mm</strong>
            </div>
            <div>
              <span>{text.sensor}</span>
              <strong>{selectedProfile.sensorWidthMm.toFixed(1)}mm</strong>
            </div>
            <div>
              <span>{text.filters}</span>
              <strong>{selectedProfile.filterSet}</strong>
            </div>
            <div>
              <span>{text.guide}</span>
              <strong>{selectedProfile.guidingSetup}</strong>
            </div>
          </div>

          <div className="profile-actions" aria-label={text.actions}>
            <button type="button" onClick={openEditor} disabled={busy} title={text.edit}>
              <Pencil size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDuplicateProfile(selectedProfile.id)}
              disabled={busy}
              title={text.duplicate}
            >
              <Copy size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={requestDelete}
              disabled={busy || profiles.length <= 1}
              title={text.delete}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        </>
      )}

      <button
        className="profile-save-button"
        type="button"
        onClick={onSaveCurrent}
        disabled={busy}
      >
        <Save size={15} aria-hidden="true" />
        {busy ? text.saving : text.saveCurrent}
      </button>

      {editorOpen && selectedProfile && createPortal(
        <div className="profile-editor-backdrop" role="dialog" aria-modal="true">
          <form className="profile-editor" onSubmit={submitProfile}>
            <div className="profile-editor-head">
              <div>
                <span>{text.manager}</span>
                <strong>{selectedProfile.name}</strong>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setEditorOpen(false)}
                title={text.close}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <div className="profile-form-grid">
              <label className="field-row">
                <span>{text.labels.name}</span>
                <input
                  value={draft.name}
                  maxLength={80}
                  required
                  onChange={(event) => updateDraft("name", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.site}</span>
                <input
                  value={draft.siteName}
                  maxLength={80}
                  required
                  onChange={(event) => updateDraft("siteName", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.telescope}</span>
                <input
                  value={draft.telescopeName}
                  maxLength={80}
                  required
                  onChange={(event) => updateDraft("telescopeName", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.telescopeType}</span>
                <input
                  value={draft.telescopeType}
                  maxLength={80}
                  onChange={(event) => updateDraft("telescopeType", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.timezone}</span>
                <input
                  value={draft.timezone}
                  maxLength={64}
                  required
                  onChange={(event) => updateDraft("timezone", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.latitude}</span>
                <input
                  type="number"
                  value={draft.latitudeDeg}
                  min={-90}
                  max={90}
                  step={0.0001}
                  onChange={(event) => updateDraftNumber("latitudeDeg", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.longitude}</span>
                <input
                  type="number"
                  value={draft.longitudeDeg}
                  min={-180}
                  max={180}
                  step={0.0001}
                  onChange={(event) => updateDraftNumber("longitudeDeg", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.bortle}</span>
                <input
                  type="number"
                  value={draft.bortle}
                  min={1}
                  max={9}
                  step={1}
                  onChange={(event) => updateDraftNumber("bortle", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.aperture}</span>
                <input
                  type="number"
                  value={draft.apertureMm}
                  min={1}
                  max={1500}
                  step={1}
                  onChange={(event) => updateDraftNumber("apertureMm", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.focalLength}</span>
                <input
                  type="number"
                  value={draft.focalLengthMm}
                  min={1}
                  max={5000}
                  step={1}
                  onChange={(event) => updateDraftNumber("focalLengthMm", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.reducerName}</span>
                <input
                  value={draft.reducerName}
                  maxLength={80}
                  onChange={(event) => updateDraft("reducerName", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.reducer}</span>
                <input
                  type="number"
                  value={draft.reducer}
                  min={0.1}
                  max={3}
                  step={0.01}
                  onChange={(event) => updateDraftNumber("reducer", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.camera}</span>
                <input
                  value={draft.cameraName}
                  maxLength={80}
                  onChange={(event) => updateDraft("cameraName", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.sensorPreset}</span>
                <select value={sensorSelectValue} onChange={(event) => selectSensor(event.target.value)}>
                  <option value="custom">{text.labels.customSensor}</option>
                  {sensorPresets.map((sensor) => (
                    <option key={sensor.id} value={sensor.id}>
                      {sensor.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-row">
                <span>{text.labels.sensorName}</span>
                <input
                  value={draft.sensorName}
                  maxLength={80}
                  required
                  onChange={(event) => updateDraft("sensorName", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.sensorWidth}</span>
                <input
                  type="number"
                  value={draft.sensorWidthMm}
                  min={0.1}
                  max={80}
                  step={0.01}
                  onChange={(event) => updateDraftNumber("sensorWidthMm", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.sensorHeight}</span>
                <input
                  type="number"
                  value={draft.sensorHeightMm}
                  min={0.1}
                  max={80}
                  step={0.01}
                  onChange={(event) => updateDraftNumber("sensorHeightMm", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.pixelSize}</span>
                <input
                  type="number"
                  value={draft.pixelSizeUm}
                  min={0.1}
                  max={20}
                  step={0.01}
                  onChange={(event) => updateDraftNumber("pixelSizeUm", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.filterSet}</span>
                <input
                  value={draft.filterSet}
                  maxLength={120}
                  onChange={(event) => updateDraft("filterSet", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.filterWheel}</span>
                <input
                  value={draft.filterWheel}
                  maxLength={80}
                  onChange={(event) => updateDraft("filterWheel", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.guiding}</span>
                <input
                  value={draft.guidingSetup}
                  maxLength={100}
                  onChange={(event) => updateDraft("guidingSetup", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.guideCamera}</span>
                <input
                  value={draft.guideCameraName}
                  maxLength={80}
                  onChange={(event) => updateDraft("guideCameraName", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.focuser}</span>
                <input
                  value={draft.focuserName}
                  maxLength={80}
                  onChange={(event) => updateDraft("focuserName", event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>{text.labels.mount}</span>
                <input
                  value={draft.mountName}
                  maxLength={80}
                  onChange={(event) => updateDraft("mountName", event.target.value)}
                />
              </label>
            </div>

            {error && <p className="profile-editor-error">{error}</p>}

            <div className="profile-editor-actions">
              <button type="button" onClick={() => setEditorOpen(false)} disabled={busy}>
                <X size={15} aria-hidden="true" />
                {text.cancel}
              </button>
              <button type="submit" disabled={busy}>
                <Check size={15} aria-hidden="true" />
                {text.saveChanges}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}

type NumericProfileField = {
  [Key in keyof ProfilePayload]: ProfilePayload[Key] extends number ? Key : never;
}[keyof ProfilePayload];

function createEmptyDraft(): ProfilePayload {
  return {
    name: "",
    siteName: "",
    latitudeDeg: 50.2649,
    longitudeDeg: 19.0238,
    timezone: "Europe/Warsaw",
    bortle: 5,
    telescopeName: "",
    telescopeType: "Refractor",
    apertureMm: 80,
    focalLengthMm: 480,
    reducerName: "Native / flattener",
    reducer: 1,
    cameraName: "Dedicated astro camera",
    sensorId: "imx571",
    sensorName: "Sony IMX571",
    sensorWidthMm: 23.5,
    sensorHeightMm: 15.7,
    pixelSizeUm: 3.76,
    filterSet: "LRGB + Ha/OIII/SII",
    filterWheel: "Filter drawer",
    guidingSetup: "50mm guide scope",
    guideCameraName: "ASI120MM class",
    focuserName: "Manual focuser",
    mountName: "Equatorial mount"
  };
}

function sanitizeDraft(draft: ProfilePayload): ProfilePayload {
  return {
    ...draft,
    name: draft.name.trim(),
    siteName: draft.siteName.trim(),
    timezone: draft.timezone.trim(),
    telescopeName: draft.telescopeName.trim(),
    telescopeType: draft.telescopeType.trim() || "Refractor",
    reducerName: draft.reducerName.trim() || "None",
    cameraName: draft.cameraName.trim() || "Dedicated astro camera",
    sensorId: draft.sensorId.trim() || "custom",
    sensorName: draft.sensorName.trim() || "Custom sensor",
    filterSet: draft.filterSet.trim() || "LRGB + Ha/OIII/SII",
    filterWheel: draft.filterWheel.trim() || "Manual drawer",
    guidingSetup: draft.guidingSetup.trim() || "50mm guide scope",
    guideCameraName: draft.guideCameraName.trim() || "ASI120MM class",
    focuserName: draft.focuserName.trim() || "Manual focuser",
    mountName: draft.mountName.trim() || "Equatorial mount"
  };
}

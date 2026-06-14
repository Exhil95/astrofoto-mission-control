import { Database, MapPinned, Save, Telescope } from "lucide-react";
import type { EquipmentProfile } from "../lib/profiles";

type ProfileDockProps = {
  profiles: EquipmentProfile[];
  selectedProfileId: number | null;
  saving: boolean;
  onSelectProfile: (profileId: number) => void;
  onSaveCurrent: () => void;
};

export function ProfileDock({
  profiles,
  selectedProfileId,
  saving,
  onSelectProfile,
  onSaveCurrent
}: ProfileDockProps) {
  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0];

  return (
    <div className="stack profile-dock">
      <div className="section-title">
        <span>Profile</span>
        <strong>{profiles.length}</strong>
      </div>

      <label className="field-row">
        <span>
          <Database size={15} aria-hidden="true" />
          Equipment + site
        </span>
        <select
          value={selectedProfile?.id ?? ""}
          onChange={(event) => onSelectProfile(Number(event.target.value))}
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
            <span>{selectedProfile.siteName}</span>
            <strong>{selectedProfile.name}</strong>
            <em>
              {selectedProfile.telescopeName} / {selectedProfile.sensorName}
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
                Focal
              </span>
              <strong>{selectedProfile.focalLengthMm.toFixed(0)}mm</strong>
            </div>
            <div>
              <span>Sensor</span>
              <strong>{selectedProfile.sensorWidthMm.toFixed(1)}mm</strong>
            </div>
          </div>
        </>
      )}

      <button className="profile-save-button" type="button" onClick={onSaveCurrent}>
        <Save size={15} aria-hidden="true" />
        {saving ? "Saving" : "Save current"}
      </button>
    </div>
  );
}

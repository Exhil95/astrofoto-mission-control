import { Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { FovResult } from "../lib/fov";
import {
  translateDifficulty,
  translateExposureHint,
  translateSeason,
  translateTargetType,
  translations,
  type SupportedLanguage
} from "../lib/i18n";
import type { Target } from "../lib/targets";

type TargetRailProps = {
  targets: Target[];
  selectedTarget: Target;
  fov: FovResult;
  language: SupportedLanguage;
  onSelectTarget: (targetId: string) => void;
};

type FitKind = "fits" | "tight" | "mosaic" | "small";

type TargetFit = {
  kind: FitKind;
  label: string;
  load: number;
};

const fitOrder: Record<FitKind, number> = {
  fits: 0,
  tight: 1,
  small: 2,
  mosaic: 3
};

export function TargetRail({ targets, selectedTarget, fov, language, onSelectTarget }: TargetRailProps) {
  const text = translations[language].targetRail;
  const common = translations[language].common;
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [seasonFilter, setSeasonFilter] = useState("All");
  const [fitFilter, setFitFilter] = useState("All");

  const targetTypes = useMemo(() => uniqueValues(targets.map((target) => target.type)), [targets]);
  const seasons = useMemo(() => uniqueValues(targets.map((target) => target.season)), [targets]);
  const selectedFit = calculateTargetFit(selectedTarget, fov);

  const catalog = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return targets
      .map((target) => ({ target, fit: calculateTargetFit(target, fov) }))
      .filter(({ target, fit }) => {
        const haystack = [
          target.name,
          target.catalogId,
          target.constellation,
          target.type,
          target.season,
          target.exposureHint
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!normalizedQuery || haystack.includes(normalizedQuery)) &&
          (typeFilter === "All" || target.type === typeFilter) &&
          (seasonFilter === "All" || target.season === seasonFilter) &&
          (fitFilter === "All" || fit.kind === fitFilter)
        );
      })
      .sort((left, right) => {
        const fitDelta = fitOrder[left.fit.kind] - fitOrder[right.fit.kind];
        if (fitDelta !== 0) return fitDelta;
        return left.target.magnitude - right.target.magnitude;
      });
  }, [targets, fov, query, typeFilter, seasonFilter, fitFilter]);

  return (
    <div className="stack target-catalog">
      <div className="section-title">
        <span>{text.catalog}</span>
        <strong>
          {catalog.length}/{targets.length}
        </strong>
      </div>

      <label className="field-row target-search">
        <span>
          <Search size={15} aria-hidden="true" />
          {text.search}
        </span>
        <input
          value={query}
          placeholder={text.placeholder}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="catalog-filter-row" aria-label={text.filters}>
        <label className="field-row">
          <span>
            <Filter size={14} aria-hidden="true" />
            {text.type}
          </span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="All">{common.all}</option>
            {targetTypes.map((type) => (
              <option key={type} value={type}>
                {translateTargetType(language, type)}
              </option>
            ))}
          </select>
        </label>
        <label className="field-row">
          <span>{text.season}</span>
          <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}>
            <option value="All">{common.all}</option>
            {seasons.map((season) => (
              <option key={season} value={season}>
                {translateSeason(language, season)}
              </option>
            ))}
          </select>
        </label>
        <label className="field-row">
          <span>{text.fov}</span>
          <select value={fitFilter} onChange={(event) => setFitFilter(event.target.value)}>
            <option value="All">{common.all}</option>
            <option value="fits">{text.fitLabels.fits}</option>
            <option value="tight">{text.fitLabels.tight}</option>
            <option value="mosaic">{text.fitLabels.mosaic}</option>
            <option value="small">{text.fitLabels.small}</option>
          </select>
        </label>
      </div>

      <div className="target-list">
        {catalog.map(({ target, fit }) => (
          <button
            key={target.id}
            className={`target-row target-row-${fit.kind} ${
              target.id === selectedTarget.id ? "is-selected" : ""
            }`}
            type="button"
            onClick={() => onSelectTarget(target.id)}
          >
            <span className="target-thumb" style={{ backgroundColor: target.tint }}>
              <img src={target.imageUrl} alt="" loading="lazy" />
            </span>
            <span>
              <strong>{target.name}</strong>
              <small>
                {target.catalogId} / {target.constellation}
              </small>
            </span>
            <span className="target-score">
              <em>{target.magnitude.toFixed(1)}</em>
              <b className={`fit-chip fit-chip-${fit.kind}`}>{text.fitLabels[fit.kind]}</b>
            </span>
          </button>
        ))}
      </div>

      {catalog.length === 0 && (
        <div className="target-empty">
          <strong>{text.noMatch}</strong>
          <span>{text.adjustFilters}</span>
        </div>
      )}

      <div className="metric-grid target-detail-grid">
        <div>
          <span>{text.type}</span>
          <strong>{translateTargetType(language, selectedTarget.type)}</strong>
        </div>
        <div>
          <span>{text.size}</span>
          <strong>{formatArcmin(selectedTarget)}</strong>
        </div>
        <div>
          <span>{text.fit}</span>
          <strong>{text.fitLabels[selectedFit.kind]} {Math.round(selectedFit.load * 100)}%</strong>
        </div>
        <div>
          <span>{text.footprint}</span>
          <strong>{formatFootprint(selectedTarget, fov)}</strong>
        </div>
        <div>
          <span>{text.season}</span>
          <strong>{selectedTarget.bestMonths}</strong>
        </div>
        <div>
          <span>{text.difficulty}</span>
          <strong>{translateDifficulty(language, selectedTarget.difficulty)}</strong>
        </div>
        <div>
          <span>{text.signal}</span>
          <strong>{translateExposureHint(language, selectedTarget.exposureHint)}</strong>
        </div>
      </div>
    </div>
  );
}

function calculateTargetFit(target: Target, fov: FovResult): TargetFit {
  const fovWidthArcmin = fov.horizontalDeg * 60;
  const fovHeightArcmin = fov.verticalDeg * 60;
  const load = Math.max(target.angularWidthArcmin / fovWidthArcmin, target.angularHeightArcmin / fovHeightArcmin);

  if (load <= 0.2) return { kind: "small", label: "Small", load };
  if (load <= 0.78) return { kind: "fits", label: "Fits", load };
  if (load <= 1.05) return { kind: "tight", label: "Tight", load };
  return { kind: "mosaic", label: "Mosaic", load };
}

function formatArcmin(target: Target) {
  return `${target.angularWidthArcmin} x ${target.angularHeightArcmin}'`;
}

function formatFootprint(target: Target, fov: FovResult) {
  const widthPercent = Math.round((target.angularWidthArcmin / (fov.horizontalDeg * 60)) * 100);
  const heightPercent = Math.round((target.angularHeightArcmin / (fov.verticalDeg * 60)) * 100);
  return `${widthPercent}% x ${heightPercent}%`;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

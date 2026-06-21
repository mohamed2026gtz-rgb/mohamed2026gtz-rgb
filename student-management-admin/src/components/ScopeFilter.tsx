export interface ScopeOption<T extends string | number | null> {
  label: string;
  value: T;
  subtitle?: string;
}

type StringOptionInput = string | ScopeOption<string | null>;
type SchoolOptionInput = ScopeOption<number | null> | { id: number; label: string };

function normalizeStringOptions(
  items: StringOptionInput[],
  allLabel: string
): ScopeOption<string | null>[] {
  const normalized = items.map((item) =>
    typeof item === 'string' ? { label: item, value: item } : item
  );
  return [{ label: allLabel, value: null }, ...normalized];
}

function normalizeSchoolOptions(items: SchoolOptionInput[]): ScopeOption<number | null>[] {
  const normalized = items.map((item) =>
    'value' in item ? item : { label: item.label, value: item.id }
  );
  return [{ label: 'All schools', value: null }, ...normalized];
}

interface ScopeFilterProps {
  title?: string;
  hideSchool?: boolean;
  showSchool?: boolean;
  regionOptions: StringOptionInput[];
  levelOptions: StringOptionInput[];
  schoolOptions?: SchoolOptionInput[];
  selectedRegion: string | null;
  selectedLevel: string | null;
  selectedSchoolId?: number | null;
  onRegionChange: (value: string | null) => void;
  onLevelChange: (value: string | null) => void;
  onSchoolChange?: (value: number | null) => void;
  lockRegion?: boolean;
  lockLevel?: boolean;
  lockSchool?: boolean;
  lockedFilters?: { region?: boolean; level?: boolean; school?: boolean };
  loadingSchools?: boolean;
  scopeLabel?: string | null;
  scopeBanner?: string | null;
  search?: string;
  onSearchChange?: (value: string) => void;
  onApply?: () => void;
  applyLabel?: string;
  searchPlaceholder?: string;
}

export function ScopeFilter({
  title = 'Scope filters',
  hideSchool = false,
  showSchool,
  regionOptions,
  levelOptions,
  schoolOptions = [],
  selectedRegion,
  selectedLevel,
  selectedSchoolId = null,
  onRegionChange,
  onLevelChange,
  onSchoolChange,
  lockRegion,
  lockLevel,
  lockSchool,
  lockedFilters,
  loadingSchools,
  scopeLabel,
  scopeBanner,
  search,
  onSearchChange,
  onApply,
  applyLabel = 'Apply filters',
  searchPlaceholder = 'Search...',
}: ScopeFilterProps) {
  const displaySchool = showSchool ?? !hideSchool;
  const banner = scopeBanner ?? scopeLabel ?? null;
  const regionLocked = lockRegion ?? lockedFilters?.region ?? false;
  const levelLocked = lockLevel ?? lockedFilters?.level ?? false;
  const schoolLocked = lockSchool ?? lockedFilters?.school ?? false;

  const regionSelectOptions = normalizeStringOptions(regionOptions, 'All regions');
  const levelSelectOptions = normalizeStringOptions(levelOptions, 'All levels');
  const schoolSelectOptions = normalizeSchoolOptions(schoolOptions);

  return (
    <section className="panel scope-filter">
      <h2>{title}</h2>
      {banner ? <p className="scope-banner">{banner}</p> : null}

      <div className="filters-grid">
        <label>
          Region
          <select
            value={selectedRegion ?? ''}
            onChange={(event) => onRegionChange(event.target.value || null)}
            disabled={regionLocked}
          >
            {regionSelectOptions.map((option) => (
              <option key={option.value ?? '__all__'} value={option.value ?? ''}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Level
          <select
            value={selectedLevel ?? ''}
            onChange={(event) => onLevelChange(event.target.value || null)}
            disabled={levelLocked}
          >
            {levelSelectOptions.map((option) => (
              <option key={option.value ?? '__all__'} value={option.value ?? ''}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {displaySchool ? (
          <label>
            School
            <select
              value={selectedSchoolId ?? ''}
              onChange={(event) => {
                const next = Number(event.target.value);
                onSchoolChange?.(Number.isFinite(next) && next > 0 ? next : null);
              }}
              disabled={schoolLocked || loadingSchools}
            >
              {schoolSelectOptions.map((option) => (
                <option key={option.value ?? '__all__'} value={option.value ?? ''}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {onSearchChange ? (
          <label>
            Search
            <input
              type="search"
              value={search ?? ''}
              placeholder={searchPlaceholder}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
        ) : null}
      </div>

      {displaySchool && loadingSchools ? <p className="muted">Loading school options...</p> : null}

      {onApply ? (
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={onApply}>
            {applyLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRegions, getSchoolLevels } from '../api/catalog';
import { PageHeader } from '../components/PageHeader';
import { ScopeFilter } from '../components/ScopeFilter';
import { useAuth } from '../context/AuthContext';
import { loadAccessibleSchools, resolveScopeFiltersAsync } from '../utils/scopeDefaults';
import type { Region, School } from '../types';

export function SchoolsPage() {
  const { user } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scopeLabel, setScopeLabel] = useState<string | null>(null);
  const [lockRegion, setLockRegion] = useState(false);
  const [lockLevel, setLockLevel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const regionOptions = useMemo(() => {
    const names = regions.map((region) => region.name).filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [regions]);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await loadAccessibleSchools(user, {
        regionId: selectedRegionId,
        region: selectedRegion,
        level: selectedLevel,
        search: search.trim() || undefined,
      });
      setSchools(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schools');
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedLevel, selectedRegion, selectedRegionId, user]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [regionRows, levelRows] = await Promise.all([getRegions(), getSchoolLevels()]);
        if (cancelled) return;
        setRegions(regionRows);
        setLevels(levelRows);

        const defaults = await resolveScopeFiltersAsync(user, regionRows);
        if (cancelled) return;
        setScopeLabel(defaults.scopeLabel);
        setSelectedRegion(defaults.regionName);
        setSelectedRegionId(defaults.regionId);
        setSelectedLevel(defaults.level);
        setLockRegion(defaults.lockRegion);
        setLockLevel(defaults.lockLevel);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load filters');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  function handleRegionChange(value: string | null) {
    setSelectedRegion(value);
    if (!value) {
      setSelectedRegionId(null);
      return;
    }
    const row = regions.find((region) => region.name === value);
    setSelectedRegionId(row ? Number(row.auto) : null);
  }

  function buildStudentsLink(school: School) {
    const params = new URLSearchParams();
    params.set('auto', '1');
    params.set('schoolId', String(school.schoolId));
    if (school.region) params.set('region', school.region);
    if (school.regionId != null) params.set('regionId', String(school.regionId));
    if (school.schoolLevel) params.set('level', school.schoolLevel);
    return `/students?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Schools"
        subtitle="Browse schools by region, level, and search. Open a school to list students."
      />

      <ScopeFilter
        regionOptions={regionOptions}
        levelOptions={levels}
        selectedRegion={selectedRegion}
        selectedLevel={selectedLevel}
        onRegionChange={handleRegionChange}
        onLevelChange={setSelectedLevel}
        search={search}
        onSearchChange={setSearch}
        onApply={loadSchools}
        lockRegion={lockRegion}
        lockLevel={lockLevel}
        hideSchool
        scopeLabel={scopeLabel}
      />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">Loading schools...</p> : null}

      {!loading ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>School Number</th>
                <th>School Name</th>
                <th>Region</th>
                <th>Level</th>
                <th>District</th>
                <th>Students</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {schools.map((school) => (
                <tr key={school.schoolId}>
                  <td>{school.schoolNumber || '-'}</td>
                  <td>{school.schoolName || '-'}</td>
                  <td>{school.region || '-'}</td>
                  <td>{school.schoolLevel || '-'}</td>
                  <td>{school.district || '-'}</td>
                  <td>{school.studentCount != null ? school.studentCount.toLocaleString() : '-'}</td>
                  <td>
                    <Link to={buildStudentsLink(school)} className="link-btn">
                      Students
                    </Link>
                  </td>
                </tr>
              ))}
              {!schools.length ? (
                <tr>
                  <td colSpan={7} className="muted table-empty">
                    No schools found for the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
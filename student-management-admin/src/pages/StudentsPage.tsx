import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getRegions, getSchoolLevels } from '../api/catalog';
import { getStudents } from '../api/students';
import { Pagination } from '../components/Pagination';
import { PageHeader } from '../components/PageHeader';
import { ScopeFilter } from '../components/ScopeFilter';
import { useAuth } from '../context/AuthContext';
import {
  canGenerateStudentList,
  loadAccessibleSchools,
  resolveScopeFiltersAsync,
} from '../utils/scopeDefaults';
import type { Region, School, Student } from '../types';

const PAGE_SIZE = 50;

export function StudentsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [regions, setRegions] = useState<Region[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [schoolOptionsRaw, setSchoolOptionsRaw] = useState<School[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const [scopeLabel, setScopeLabel] = useState<string | null>(null);
  const [lockRegion, setLockRegion] = useState(false);
  const [lockLevel, setLockLevel] = useState(false);
  const [lockSchool, setLockSchool] = useState(false);

  const [items, setItems] = useState<Student[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const regionOptions = useMemo(() => {
    const names = regions.map((region) => region.name).filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [regions]);

  const schoolOptions = useMemo(
    () =>
      schoolOptionsRaw.map((school) => ({
        id: school.schoolId,
        label: [school.schoolName, school.schoolNumber].filter(Boolean).join(' - ') || `School ${school.schoolId}`,
      })),
    [schoolOptionsRaw]
  );

  const canGenerate = canGenerateStudentList(user, selectedRegion, selectedRegionId, selectedSchoolId);

  const loadSchoolOptions = useCallback(async () => {
    try {
      const rows = await loadAccessibleSchools(user, {
        regionId: selectedRegionId,
        region: selectedRegion,
        level: selectedLevel,
      });
      setSchoolOptionsRaw(rows);
      if (selectedSchoolId && !rows.some((school) => school.schoolId === selectedSchoolId) && !lockSchool) {
        setSelectedSchoolId(null);
      }
    } catch {
      setSchoolOptionsRaw([]);
    }
  }, [lockSchool, selectedLevel, selectedRegion, selectedRegionId, selectedSchoolId, user]);

  const generateList = useCallback(
    async (pageNumber = 1) => {
      if (!canGenerateStudentList(user, selectedRegion, selectedRegionId, selectedSchoolId)) {
        setError('Select a region or school in your access scope before generating.');
        return;
      }

      setLoadingStudents(true);
      setError(null);
      try {
        const result = await getStudents({
          page: pageNumber,
          pageSize: PAGE_SIZE,
          search: search.trim() || undefined,
          regionId: selectedRegionId || undefined,
          region: selectedRegionId ? undefined : selectedRegion || undefined,
          level: selectedLevel || undefined,
          schoolId: selectedSchoolId || undefined,
          searchAllSchools: Boolean(!selectedSchoolId && (selectedRegion || selectedRegionId)),
        });

        setItems(result.items);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
        setGenerated(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load students');
        setItems([]);
      } finally {
        setLoadingStudents(false);
      }
    },
    [search, selectedLevel, selectedRegion, selectedRegionId, selectedSchoolId, user]
  );

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

        const paramRegion = searchParams.get('region');
        const paramRegionId = searchParams.get('regionId');
        const paramLevel = searchParams.get('level');
        const paramSchoolId = searchParams.get('schoolId');

        const queryRegionId = paramRegionId ? Number(paramRegionId) : Number.NaN;
        const querySchoolId = paramSchoolId ? Number(paramSchoolId) : Number.NaN;

        setScopeLabel(defaults.scopeLabel);
        setLockRegion(defaults.lockRegion);
        setLockLevel(defaults.lockLevel);
        setLockSchool(defaults.lockSchool);

        setSelectedRegion(paramRegion || defaults.regionName || null);
        setSelectedRegionId(
          Number.isFinite(queryRegionId) && queryRegionId > 0 ? queryRegionId : defaults.regionId
        );
        setSelectedLevel(paramLevel || defaults.level || null);
        setSelectedSchoolId(
          Number.isFinite(querySchoolId) && querySchoolId > 0 ? querySchoolId : defaults.schoolId
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load student filters');
        }
      } finally {
        if (!cancelled) {
          setLoadingFilters(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, user]);

  useEffect(() => {
    if (loadingFilters) return;
    loadSchoolOptions();
  }, [loadSchoolOptions, loadingFilters]);

  useEffect(() => {
    if (loadingFilters) return;
    if (searchParams.get('auto') === '1') {
      generateList(1);
    }
  }, [generateList, loadingFilters, searchParams]);

  function handleRegionChange(value: string | null) {
    setSelectedRegion(value);
    setGenerated(false);
    setPage(1);
    if (!value) {
      setSelectedRegionId(null);
      if (!lockSchool) setSelectedSchoolId(null);
      return;
    }
    const region = regions.find((row) => row.name === value);
    setSelectedRegionId(region ? Number(region.auto) : null);
    if (!lockSchool) setSelectedSchoolId(null);
  }

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Generate student lists by scope filters, then open profile or transcript details."
      />

      <ScopeFilter
        regionOptions={regionOptions}
        levelOptions={levels}
        schoolOptions={schoolOptions}
        selectedRegion={selectedRegion}
        selectedLevel={selectedLevel}
        selectedSchoolId={selectedSchoolId}
        onRegionChange={handleRegionChange}
        onLevelChange={(value) => {
          setSelectedLevel(value);
          if (!lockSchool) setSelectedSchoolId(null);
          setGenerated(false);
          setPage(1);
        }}
        onSchoolChange={(value) => {
          setSelectedSchoolId(value);
          setGenerated(false);
          setPage(1);
        }}
        search={search}
        onSearchChange={setSearch}
        onApply={() => generateList(1)}
        lockRegion={lockRegion}
        lockLevel={lockLevel}
        lockSchool={lockSchool}
        scopeLabel={scopeLabel}
      />

      {!canGenerate ? (
        <p className="muted">
          Select a region or school in your allowed scope, then click <strong>Apply filters</strong>.
        </p>
      ) : null}

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loadingFilters || loadingStudents ? <p className="muted">Loading students...</p> : null}

      {generated && !loadingStudents ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student No</th>
                  <th>Name</th>
                  <th>Sex</th>
                  <th>School</th>
                  <th>Level</th>
                  <th>Photo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((student) => (
                  <tr key={student.studentNo}>
                    <td>{student.registrationNo || student.studentNo}</td>
                    <td>{student.fullName || '-'}</td>
                    <td>{student.sex || '-'}</td>
                    <td>{student.schoolName || '-'}</td>
                    <td>{student.schoolLevel || student.level || '-'}</td>
                    <td>{student.hasPicture ? 'Yes' : 'No'}</td>
                    <td>
                      <Link to={`/students/${encodeURIComponent(student.studentNo)}`} className="link-btn">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {!items.length ? (
                  <tr>
                    <td colSpan={7} className="muted table-empty">
                      No students found for these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={(nextPage) => generateList(nextPage)}
          />
        </>
      ) : null}
    </div>
  );
}
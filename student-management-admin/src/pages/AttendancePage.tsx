import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRegions, getSchoolLevels } from '../api/catalog';
import {
  getExamAttendanceMapForSession,
  saveBulkExamAttendance,
  todayDateString,
} from '../api/attendance';
import { getExamSessionsForAttendance, sessionSubjectLabel } from '../api/examSchedule';
import { getStudents } from '../api/students';
import { PageHeader } from '../components/PageHeader';
import { ScopeFilter } from '../components/ScopeFilter';
import { useAuth } from '../context/AuthContext';
import {
  canGenerateStudentList,
  loadAccessibleSchools,
  resolveScopeFiltersAsync,
} from '../utils/scopeDefaults';
import type { ExamTimetableEntry, Region, School, Student } from '../types';

export function AttendancePage() {
  const { user } = useAuth();

  const [regions, setRegions] = useState<Region[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const [attendanceDate, setAttendanceDate] = useState(todayDateString());
  const [examSessions, setExamSessions] = useState<ExamTimetableEntry[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  const [items, setItems] = useState<Student[]>([]);
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [scopeLabel, setScopeLabel] = useState<string | null>(null);
  const [lockRegion, setLockRegion] = useState(false);
  const [lockLevel, setLockLevel] = useState(false);
  const [lockSchool, setLockSchool] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regionOptions = useMemo(() => {
    const names = regions.map((region) => region.name).filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [regions]);

  const schoolOptions = useMemo(
    () =>
      schools.map((school) => ({
        id: school.schoolId,
        label: [school.schoolName, school.schoolNumber].filter(Boolean).join(' - ') || `School ${school.schoolId}`,
      })),
    [schools]
  );

  const visiblePresentCount = useMemo(
    () => items.filter((student) => presentMap[student.studentNo] !== false).length,
    [items, presentMap]
  );

  const canGenerate = canGenerateStudentList(user, selectedRegion, selectedRegionId, selectedSchoolId);

  const refreshExistingAttendance = useCallback(
    async (students: Student[], subject: string, date: string) => {
      const trimmedSubject = subject.trim();
      const trimmedDate = date.trim();
      if (!trimmedSubject || !trimmedDate || students.length === 0) {
        const defaults: Record<string, boolean> = {};
        students.forEach((student) => {
          defaults[student.studentNo] = true;
        });
        setPresentMap(defaults);
        return;
      }

      const map = await getExamAttendanceMapForSession(
        trimmedSubject,
        trimmedDate,
        students.map((student) => student.studentNo)
      );

      const initial: Record<string, boolean> = {};
      students.forEach((student) => {
        const record = map.get(student.studentNo);
        initial[student.studentNo] = record ? record.status === 'Present' : true;
      });
      setPresentMap(initial);
    },
    []
  );

  const loadSchoolOptions = useCallback(async () => {
    try {
      const rows = await loadAccessibleSchools(user, {
        regionId: selectedRegionId,
        region: selectedRegion,
        level: selectedLevel,
      });
      setSchools(rows);
      if (selectedSchoolId && !rows.some((school) => school.schoolId === selectedSchoolId) && !lockSchool) {
        setSelectedSchoolId(null);
      }
    } catch {
      setSchools([]);
    }
  }, [lockSchool, selectedLevel, selectedRegion, selectedRegionId, selectedSchoolId, user]);

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
        setSelectedSchoolId(defaults.schoolId);
        setLockRegion(defaults.lockRegion);
        setLockLevel(defaults.lockLevel);
        setLockSchool(defaults.lockSchool);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load filters');
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (loadingFilters) return;
    loadSchoolOptions();
  }, [loadSchoolOptions, loadingFilters]);

  useEffect(() => {
    if (!selectedLevel || !attendanceDate) {
      setExamSessions([]);
      setSelectedSubject('');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const sessions = await getExamSessionsForAttendance(selectedLevel, attendanceDate);
        if (cancelled) return;
        setExamSessions(sessions);
        if (selectedSubject && !sessions.some((session) => sessionSubjectLabel(session) === selectedSubject)) {
          setSelectedSubject('');
        }
      } catch {
        if (!cancelled) {
          setExamSessions([]);
          setSelectedSubject('');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attendanceDate, selectedLevel, selectedSubject]);

  async function loadStudentsForAttendance() {
    if (!canGenerateStudentList(user, selectedRegion, selectedRegionId, selectedSchoolId)) {
      setError('Select at least a region or school in your scope.');
      return;
    }

    if (!selectedSubject.trim()) {
      setError('Select an exam session/subject first.');
      return;
    }

    setLoadingStudents(true);
    setError(null);
    try {
      const result = await getStudents({
        page: 1,
        pageSize: 200,
        search: search.trim() || undefined,
        regionId: selectedRegionId || undefined,
        region: selectedRegionId ? undefined : selectedRegion || undefined,
        level: selectedLevel || undefined,
        schoolId: selectedSchoolId || undefined,
        searchAllSchools: Boolean(!selectedSchoolId && (selectedRegion || selectedRegionId)),
      });

      setItems(result.items);
      await refreshExistingAttendance(result.items, selectedSubject, attendanceDate);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students for attendance');
      setItems([]);
    } finally {
      setLoadingStudents(false);
    }
  }

  async function saveBulk() {
    if (!items.length) {
      setError('Load students before saving attendance.');
      return;
    }
    if (!selectedSubject.trim()) {
      setError('Subject is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveBulkExamAttendance(
        items.map((student) => ({
          studentNo: student.studentNo,
          present: presentMap[student.studentNo] !== false,
        })),
        selectedSubject,
        attendanceDate
      );

      await refreshExistingAttendance(items, selectedSubject, attendanceDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Filter by scope, choose exam session, mark present/absent in bulk, and save."
      />

      <ScopeFilter
        regionOptions={regionOptions}
        levelOptions={levels}
        schoolOptions={schoolOptions}
        selectedRegion={selectedRegion}
        selectedLevel={selectedLevel}
        selectedSchoolId={selectedSchoolId}
        onRegionChange={(value) => {
          setSelectedRegion(value);
          setGenerated(false);
          if (!value) {
            setSelectedRegionId(null);
            if (!lockSchool) setSelectedSchoolId(null);
            return;
          }
          const region = regions.find((row) => row.name === value);
          setSelectedRegionId(region ? Number(region.auto) : null);
          if (!lockSchool) setSelectedSchoolId(null);
        }}
        onLevelChange={(value) => {
          setSelectedLevel(value);
          setGenerated(false);
          setSelectedSubject('');
          if (!lockSchool) setSelectedSchoolId(null);
        }}
        onSchoolChange={(value) => {
          setSelectedSchoolId(value);
          setGenerated(false);
        }}
        search={search}
        onSearchChange={setSearch}
        lockRegion={lockRegion}
        lockLevel={lockLevel}
        lockSchool={lockSchool}
        scopeLabel={scopeLabel}
      />

      <section className="panel form-card compact-form">
        <div className="form-inline-grid">
          <label>
            Attendance date
            <input value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
          </label>

          <label>
            Exam session / subject
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
              <option value="">Select session</option>
              {examSessions.map((session) => {
                const label = sessionSubjectLabel(session);
                return (
                  <option key={session.id} value={label}>
                    {session.examDate} - Shift {session.examShift} - {label}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        <div className="form-actions split-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={loadStudentsForAttendance}
            disabled={!canGenerate || loadingStudents}
          >
            {loadingStudents ? 'Loading...' : 'Load students'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const allTrue: Record<string, boolean> = {};
              items.forEach((student) => {
                allTrue[student.studentNo] = true;
              });
              setPresentMap(allTrue);
            }}
            disabled={!items.length}
          >
            Mark all present
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const allFalse: Record<string, boolean> = {};
              items.forEach((student) => {
                allFalse[student.studentNo] = false;
              });
              setPresentMap(allFalse);
            }}
            disabled={!items.length}
          >
            Mark all absent
          </button>
          <button type="button" className="btn btn-primary" onClick={saveBulk} disabled={saving || !items.length}>
            {saving ? 'Saving...' : 'Save bulk attendance'}
          </button>
        </div>
      </section>

      {generated ? (
        <p className="muted attendance-summary">
          {visiblePresentCount} present, {items.length - visiblePresentCount} absent ({items.length} students)
        </p>
      ) : null}

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loadingFilters ? <p className="muted">Loading attendance filters...</p> : null}

      {generated && !loadingStudents ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student No</th>
                <th>Name</th>
                <th>School</th>
                <th>Level</th>
                <th>Present</th>
              </tr>
            </thead>
            <tbody>
              {items.map((student) => (
                <tr key={student.studentNo}>
                  <td>{student.registrationNo || student.studentNo}</td>
                  <td>{student.fullName || '-'}</td>
                  <td>{student.schoolName || '-'}</td>
                  <td>{student.schoolLevel || student.level || '-'}</td>
                  <td>
                    <label className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={presentMap[student.studentNo] !== false}
                        onChange={() =>
                          setPresentMap((prev) => ({
                            ...prev,
                            [student.studentNo]: prev[student.studentNo] === false,
                          }))
                        }
                      />
                      <span>{presentMap[student.studentNo] !== false ? 'Present' : 'Absent'}</span>
                    </label>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={5} className="muted table-empty">
                    No students found for these filters.
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
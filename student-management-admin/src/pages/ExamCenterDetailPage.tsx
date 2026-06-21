import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  getExamCenterSchools,
  getExamCenterStudents,
  getExamCenterSummary,
} from '../api/examCenters';
import { Pagination } from '../components/Pagination';
import { PageHeader } from '../components/PageHeader';
import type { ExamCenterSummary, School, Student, SupervisorLevel } from '../types';

const PAGE_SIZE = 50;

function parseSupervisorLevel(raw?: string): SupervisorLevel | null {
  if (raw === 'primary' || raw === 'secondary') return raw;
  return null;
}

function levelLabel(level: SupervisorLevel): string {
  return level === 'primary' ? 'Primary' : 'Secondary';
}

export function ExamCenterDetailPage() {
  const { level: rawLevel, centerId: rawCenterId } = useParams<{ level: string; centerId: string }>();
  const level = useMemo(() => parseSupervisorLevel(rawLevel), [rawLevel]);

  const centerId = useMemo(() => {
    const parsed = Number(rawCenterId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [rawCenterId]);

  const [summary, setSummary] = useState<ExamCenterSummary | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCenterData = useCallback(async () => {
    if (!level || !centerId) return;

    setLoading(true);
    setError(null);
    try {
      const [summaryRow, schoolsRow, studentsPage] = await Promise.all([
        getExamCenterSummary(level, centerId),
        getExamCenterSchools(level, centerId, query || undefined),
        getExamCenterStudents(level, centerId, {
          page,
          pageSize: PAGE_SIZE,
          search: query || undefined,
        }),
      ]);

      setSummary(summaryRow);
      setSchools(schoolsRow);
      setStudents(studentsPage.items);
      setTotalPages(studentsPage.totalPages);
      setTotalCount(studentsPage.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load center details');
      setSummary(null);
      setSchools([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [centerId, level, page, query]);

  useEffect(() => {
    loadCenterData();
  }, [loadCenterData]);

  if (!level) return <Navigate to="/supervisors" replace />;
  if (!centerId) return <Navigate to={`/supervisors/${level}/assignments`} replace />;

  return (
    <div>
      <PageHeader
        title={`${levelLabel(level)} exam center detail`}
        subtitle="Assigned schools and students for this exam center."
        actions={
          <Link to={`/supervisors/${level}/assignments`} className="btn">
            Back to assignments
          </Link>
        }
      />

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          type="search"
          placeholder="Search school or student"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">Loading center details...</p> : null}

      {!loading && summary ? (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Center</span>
              <strong className="stat-value">{summary.centerName}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Region</span>
              <strong className="stat-value">{summary.region || '-'}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Schools</span>
              <strong className="stat-value">{summary.schoolCount.toLocaleString()}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Students</span>
              <strong className="stat-value">{summary.studentCount.toLocaleString()}</strong>
            </div>
          </div>

          <section className="panel">
            <h2>Assigned schools</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>School number</th>
                    <th>School name</th>
                    <th>Region</th>
                    <th>District</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.schoolId}>
                      <td>{school.schoolNumber || '-'}</td>
                      <td>{school.schoolName || '-'}</td>
                      <td>{school.region || '-'}</td>
                      <td>{school.district || '-'}</td>
                      <td>{school.schoolLevel || '-'}</td>
                    </tr>
                  ))}
                  {!schools.length ? (
                    <tr>
                      <td colSpan={5} className="muted table-empty">
                        No schools assigned to this center.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Students</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student no</th>
                    <th>Name</th>
                    <th>School</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.studentNo}>
                      <td>{student.registrationNo || student.studentNo}</td>
                      <td>{student.fullName || '-'}</td>
                      <td>{student.schoolName || '-'}</td>
                      <td>{student.schoolLevel || student.level || '-'}</td>
                    </tr>
                  ))}
                  {!students.length ? (
                    <tr>
                      <td colSpan={4} className="muted table-empty">
                        No students found for the current filters.
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
              onPageChange={setPage}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
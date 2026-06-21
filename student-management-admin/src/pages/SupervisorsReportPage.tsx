import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getRegions } from '../api/catalog';
import { getExamCenterSchools } from '../api/examCenters';
import {
  fetchSupervisorPhotoObjectUrl,
  getAssignments,
  getSupervisor,
} from '../api/supervisors';
import { PageHeader } from '../components/PageHeader';
import { SupervisorReportHeader } from '../components/SupervisorReportHeader';
import {
  DEFAULT_YEAR,
  type Region,
  type School,
  type SupervisorAssignment,
  type SupervisorLevel,
} from '../types';
import { exportElementToPdf, sanitizePdfFilename } from '../utils/exportPdf';
import { normalizeSexValue, sexBadgeClass } from '../utils/supervisorDisplay';

function parseSupervisorLevel(raw?: string): SupervisorLevel | null {
  if (raw === 'primary' || raw === 'secondary') return raw;
  return null;
}

function levelLabel(level: SupervisorLevel): string {
  return level === 'primary' ? 'Primary' : 'Secondary';
}

interface ReportRow {
  assignmentId: number;
  supervisorId: number;
  name: string;
  sex: string;
  mobile: string;
  centerName: string;
  region: string | null;
  photoUrl: string | null;
  schools: School[];
}

export function SupervisorsReportPage() {
  const { level: rawLevel } = useParams<{ level: string }>();
  const level = useMemo(() => parseSupervisorLevel(rawLevel), [rawLevel]);
  const reportRef = useRef<HTMLDivElement>(null);

  const [assignments, setAssignments] = useState<SupervisorAssignment[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [filterRegion, setFilterRegion] = useState('');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    if (!level) return;

    setLoadingList(true);
    setError(null);
    try {
      const [assignmentRows, regionRows] = await Promise.all([
        getAssignments(level, { academicYear: academicYear.trim() || undefined }),
        getRegions(),
      ]);
      setAssignments(assignmentRows);
      setRegions(regionRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load supervisor assignments');
      setAssignments([]);
    } finally {
      setLoadingList(false);
    }
  }, [academicYear, level]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assignments.filter((row) => {
      if (filterRegion.trim() && row.region !== filterRegion.trim()) return false;
      if (!term) return true;
      const haystack = [row.supervisorName, row.centerName, row.supervisorMobile, row.region]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [assignments, filterRegion, search]);

  useEffect(() => {
    if (!level) return undefined;

    let cancelled = false;
    const objectUrls: string[] = [];

    (async () => {
      if (!filteredAssignments.length) {
        setRows([]);
        return;
      }

      setLoadingReport(true);
      setError(null);

      try {
        const enriched = await Promise.all(
          filteredAssignments.map(async (assignment) => {
            const [supervisor, schoolRows] = await Promise.all([
              getSupervisor(level, assignment.supervisorId).catch(() => null),
              getExamCenterSchools(level, assignment.centerId).catch(() => [] as School[]),
            ]);

            let photoUrl: string | null = null;
            if (supervisor?.hasPhoto) {
              try {
                photoUrl = await fetchSupervisorPhotoObjectUrl(level, assignment.supervisorId);
                if (photoUrl?.startsWith('blob:')) objectUrls.push(photoUrl);
              } catch {
                photoUrl = null;
              }
            }

            return {
              assignmentId: assignment.id,
              supervisorId: assignment.supervisorId,
              name:
                assignment.supervisorName ||
                supervisor?.name ||
                `Supervisor #${assignment.supervisorId}`,
              sex: normalizeSexValue(supervisor?.sex) || '-',
              mobile: assignment.supervisorMobile || supervisor?.mobile || '-',
              centerName: assignment.centerName || `Center #${assignment.centerId}`,
              region: assignment.region ?? supervisor?.region ?? null,
              photoUrl,
              schools: schoolRows,
            } satisfies ReportRow;
          })
        );

        if (!cancelled) setRows(enriched);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to build supervisor report');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoadingReport(false);
      }
    })();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filteredAssignments, level]);

  const regionLabel = filterRegion.trim() || 'All regions';
  const reportTitle = `${levelLabel(level!)} Examination Supervisors Report`;

  async function handleExportPdf() {
    if (!reportRef.current || !level) return;

    setExportingPdf(true);
    setError(null);
    reportRef.current.classList.add('supervisors-report-document--pdf-export');
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const filename = sanitizePdfFilename(
        `${level}-supervisors-report-${filterRegion.trim() || 'all-regions'}-${academicYear}`
      );
      await exportElementToPdf(reportRef.current, `${filename}.pdf`, {
        orientation: 'landscape',
        margin: [4, 4, 4, 4],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      reportRef.current?.classList.remove('supervisors-report-document--pdf-export');
      setExportingPdf(false);
    }
  }

  function handlePrint() {
    requestAnimationFrame(() => window.print());
  }

  if (!level) return <Navigate to="/supervisors" replace />;

  return (
    <div className="supervisors-report-page">
      <div className="no-print">
        <PageHeader
          title={`${levelLabel(level)} supervisors report`}
          subtitle="Professional roster of assigned exam supervisors with center and host school details."
          actions={
            <div className="chip-row">
              <Link to={`/supervisors/${level}/assignments`} className="btn">
                Center assignments
              </Link>
              <Link to={`/supervisors/${level}/id-cards`} className="btn">
                ID cards
              </Link>
              <Link to={`/supervisors/${level}/list`} className="btn">
                Supervisors list
              </Link>
            </div>
          }
        />

        <section className="panel form-card compact-form">
          <h2>Report filters</h2>
          <div className="form-inline-grid columns-3">
            <label>
              Academic year
              <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
            </label>

            <label>
              Region
              <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
                <option value="">All regions</option>
                {regions.map((row) => (
                  <option key={row.auto ?? row.name} value={row.name || ''}>
                    {row.name || `Region ${row.auto}`}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Supervisor, center, or mobile"
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn" onClick={() => loadAssignments()} disabled={loadingList}>
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              disabled={!rows.length || loadingReport}
            >
              Print report
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportPdf}
              disabled={!rows.length || loadingReport || exportingPdf}
            >
              {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
            </button>
          </div>
        </section>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {loadingList || loadingReport ? (
          <p className="muted">Loading supervisor report...</p>
        ) : null}
        {!loadingList && !loadingReport && !filteredAssignments.length ? (
          <div className="alert alert-error">
            No supervisor center assignments found for {academicYear || DEFAULT_YEAR}.
          </div>
        ) : null}
      </div>

      <div ref={reportRef} className="supervisors-report-document">
        <SupervisorReportHeader
          title={reportTitle}
          levelLabel={levelLabel(level)}
          regionLabel={regionLabel}
          academicYear={academicYear || DEFAULT_YEAR}
          subtitle={`Total assigned supervisors: ${rows.length}`}
        />

        <div className="supervisors-report-table-wrap">
          <table className="supervisors-report-table">
            <thead>
              <tr>
                <th scope="col">Photo</th>
                <th scope="col">Supervisor</th>
                <th scope="col">Sex</th>
                <th scope="col">Mobile</th>
                <th scope="col">Exam center</th>
                <th scope="col">Host schools</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.assignmentId}>
                    <td className="supervisors-report-table__photo-cell">
                      {row.photoUrl ? (
                        <img
                          src={row.photoUrl}
                          alt={row.name}
                          className="supervisors-report-table__photo"
                        />
                      ) : (
                        <div className="supervisors-report-table__photo-placeholder">No photo</div>
                      )}
                    </td>
                    <td className="supervisors-report-table__name-cell">
                      <strong>{row.name}</strong>
                      {row.region ? <span className="supervisors-report-table__region">{row.region}</span> : null}
                    </td>
                    <td>
                      <span className={sexBadgeClass(row.sex === '-' ? '' : row.sex)}>{row.sex}</span>
                    </td>
                    <td className="supervisors-report-table__mobile">{row.mobile}</td>
                    <td className="supervisors-report-table__center">{row.centerName}</td>
                    <td className="supervisors-report-table__schools">
                      {row.schools.length ? (
                        <ul className="supervisors-report-school-list">
                          {row.schools.map((school) => (
                            <li key={`${row.assignmentId}-${school.schoolName || school.schoolNumber}`}>
                              <span>{school.schoolName || 'Unnamed school'}</span>
                              {typeof school.studentCount === 'number' ? (
                                <span className="supervisors-report-school-list__count">
                                  {school.studentCount.toLocaleString()} students
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="muted">No schools linked</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="supervisors-report-table__empty">
                    No supervisors to display for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="supervisors-report-footer">
          <p>
            Generated on {new Date().toLocaleDateString()} · {levelLabel(level)} examination supervisors
            {filterRegion.trim() ? ` · ${filterRegion.trim()}` : ''}
          </p>
        </footer>
      </div>
    </div>
  );
}
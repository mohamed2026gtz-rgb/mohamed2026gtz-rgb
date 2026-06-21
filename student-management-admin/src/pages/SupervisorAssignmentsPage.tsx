import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getRegions } from '../api/catalog';
import {
  getPrimaryExamCenters,
  getSecondaryExamCenters,
  syncPrimaryExamCenters,
} from '../api/examCenters';
import {
  assignSupervisor,
  getAssignments,
  getSupervisors,
  importAssignmentsFromFile,
  removeAssignment,
  type AssignmentImportResult,
} from '../api/supervisors';
import { PageHeader } from '../components/PageHeader';
import {
  DEFAULT_YEAR,
  type ExamCenter,
  type Region,
  type Supervisor,
  type SupervisorAssignment,
  type SupervisorLevel,
} from '../types';

function parseSupervisorLevel(raw?: string): SupervisorLevel | null {
  if (raw === 'primary' || raw === 'secondary') return raw;
  return null;
}

function levelLabel(level: SupervisorLevel): string {
  return level === 'primary' ? 'Primary' : 'Secondary';
}

function centerOptionLabel(center: ExamCenter): string {
  return [
    center.centerName,
    center.region || null,
    center.district || null,
    center.schoolCount != null ? `${center.schoolCount} schools` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

const ASSIGNMENT_TEMPLATE = `supervisor_email,supervisor_name,center_name,region,district,academic_year,notes
maxamed@example.com,,Baki Center,Awdal,Baki,2025/2026,
,john doe,Another Center,Awdal,,2025/2026,match by name if no email
`;

function downloadTemplate(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SupervisorAssignmentsPage() {
  const { level: rawLevel } = useParams<{ level: string }>();
  const level = useMemo(() => parseSupervisorLevel(rawLevel), [rawLevel]);

  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [centers, setCenters] = useState<ExamCenter[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [assignments, setAssignments] = useState<SupervisorAssignment[]>([]);

  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null);
  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [notes, setNotes] = useState('');

  const [filterSupervisorId, setFilterSupervisorId] = useState<number | null>(null);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCenterId, setFilterCenterId] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState(DEFAULT_YEAR);
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<AssignmentImportResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingCenters, setSyncingCenters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const yearAssignments = useMemo(
    () => assignments.filter((row) => row.academicYear === academicYear.trim()),
    [assignments, academicYear]
  );

  const assignedSupervisorIds = useMemo(
    () => new Set(yearAssignments.map((row) => row.supervisorId)),
    [yearAssignments]
  );

  const assignedCenterIds = useMemo(
    () => new Set(yearAssignments.map((row) => row.centerId)),
    [yearAssignments]
  );

  const pickableSupervisors = useMemo(() => {
    const base = onlyUnassigned
      ? supervisors.filter((row) => !assignedSupervisorIds.has(row.id))
      : supervisors;
    return base;
  }, [assignedSupervisorIds, onlyUnassigned, supervisors]);

  const pickableCenters = useMemo(() => {
    const base = onlyUnassigned
      ? centers.filter((row) => !assignedCenterIds.has(row.id))
      : centers;
    if (!selectedRegion.trim()) return [];
    return base.filter((row) => row.region === selectedRegion.trim());
  }, [assignedCenterIds, centers, onlyUnassigned, selectedRegion]);

  const filterableCenters = useMemo(() => {
    if (!filterRegion.trim()) return centers;
    return centers.filter((row) => row.region === filterRegion.trim());
  }, [centers, filterRegion]);

  const displayedAssignments = useMemo(() => {
    if (!filterRegion.trim()) return assignments;
    return assignments.filter((row) => row.region === filterRegion.trim());
  }, [assignments, filterRegion]);

  const loadOptions = useCallback(async () => {
    if (!level) return;

    const [supervisorRows, centerRows, regionRows] = await Promise.all([
      getSupervisors(level),
      level === 'primary' ? getPrimaryExamCenters() : getSecondaryExamCenters(),
      getRegions(),
    ]);
    setSupervisors(supervisorRows);
    setCenters(centerRows);
    setRegions(regionRows);
  }, [level]);

  const loadAssignments = useCallback(async () => {
    if (!level) return;

    setLoading(true);
    setError(null);
    try {
      const rows = await getAssignments(level, {
        supervisorId: filterSupervisorId || undefined,
        centerId: filterCenterId || undefined,
        academicYear: filterYear.trim() || undefined,
      });
      setAssignments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [filterCenterId, filterSupervisorId, filterYear, level]);

  useEffect(() => {
    if (!level) return;
    loadOptions().catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load assignment options');
      setSupervisors([]);
      setCenters([]);
    });
  }, [level, loadOptions]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    if (selectedSupervisorId && assignedSupervisorIds.has(selectedSupervisorId)) {
      setSelectedSupervisorId(null);
    }
    if (selectedCenterId && assignedCenterIds.has(selectedCenterId)) {
      setSelectedCenterId(null);
    }
  }, [assignedCenterIds, assignedSupervisorIds, selectedCenterId, selectedSupervisorId]);

  useEffect(() => {
    if (!selectedCenterId) return;
    const match = centers.find((row) => row.id === selectedCenterId);
    if (!selectedRegion.trim() || !match || match.region !== selectedRegion.trim()) {
      setSelectedCenterId(null);
    }
  }, [centers, selectedCenterId, selectedRegion]);

  useEffect(() => {
    if (!filterCenterId) return;
    const match = centers.find((row) => row.id === filterCenterId);
    if (filterRegion.trim() && (!match || match.region !== filterRegion.trim())) {
      setFilterCenterId(null);
    }
  }, [centers, filterCenterId, filterRegion]);

  if (!level) return <Navigate to="/supervisors" replace />;

  async function handleAssign() {
    if (!selectedSupervisorId || !selectedCenterId) {
      setError('Select both supervisor and exam center.');
      return;
    }

    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      await assignSupervisor(level!, {
        supervisorId: selectedSupervisorId,
        centerId: selectedCenterId,
        academicYear: academicYear.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setNotes('');
      setSelectedCenterId(null);
      setSelectedSupervisorId(null);
      setSelectedRegion('');
      setInfo('Supervisor assigned to exam center.');
      await Promise.all([loadAssignments(), loadOptions()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: number) {
    if (!window.confirm('Remove this supervisor assignment?')) return;

    setError(null);
    setInfo(null);
    try {
      await removeAssignment(level!, id);
      setAssignments((prev) => prev.filter((row) => row.id !== id));
      setInfo('Assignment removed.');
      await loadOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  }

  async function handleSyncCenters() {
    if (level !== 'primary') return;
    setSyncingCenters(true);
    setError(null);
    setInfo(null);
    try {
      const result = await syncPrimaryExamCenters();
      setInfo(result.message || 'Primary exam centers synced from schools.');
      await loadOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync exam centers');
    } finally {
      setSyncingCenters(false);
    }
  }

  async function handleImportAssignments() {
    if (!importFile) {
      setError('Choose a CSV file for bulk assignment import.');
      return;
    }

    setImporting(true);
    setError(null);
    setInfo(null);
    setImportResult(null);
    try {
      const summary = await importAssignmentsFromFile(level!, importFile);
      setImportResult(summary);
      setInfo(summary.message);
      setImportFile(null);
      await Promise.all([loadAssignments(), loadOptions()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk assignment import failed');
    } finally {
      setImporting(false);
    }
  }

  const unassignedSupervisorCount = supervisors.length - assignedSupervisorIds.size;
  const unassignedCenterCount = centers.length - assignedCenterIds.size;

  return (
    <div>
      <PageHeader
        title={`${levelLabel(level)} center assignments`}
        subtitle="Assign one supervisor to one exam center per academic year."
        actions={
          <div className="chip-row">
            <Link to={`/supervisors/${level}/import`} className="btn">
              Import supervisors
            </Link>
            <Link to={`/supervisors/${level}/id-cards`} className="btn">
              ID cards
            </Link>
            <Link to={`/supervisors/${level}/report`} className="btn">
              Supervisors report
            </Link>
            <Link to={`/supervisors/${level}/list`} className="btn">
              Back to supervisors
            </Link>
          </div>
        }
      />

      <div className="stat-grid compact">
        <div className="stat-card">
          <span className="stat-label">Supervisors</span>
          <strong>{supervisors.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unassigned supervisors</span>
          <strong>{Math.max(0, unassignedSupervisorCount)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Exam centers</span>
          <strong>{centers.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unassigned centers</span>
          <strong>{Math.max(0, unassignedCenterCount)}</strong>
        </div>
      </div>

      <section className="panel form-card compact-form">
        <div className="panel-heading-row">
          <h2>Assign supervisor to center</h2>
          {level === 'primary' ? (
            <button type="button" className="btn" onClick={handleSyncCenters} disabled={syncingCenters}>
              {syncingCenters ? 'Syncing centers...' : 'Sync primary centers from schools'}
            </button>
          ) : null}
        </div>

        <p className="muted">
          One supervisor and one center can each have only one assignment for {academicYear || DEFAULT_YEAR}.
          {onlyUnassigned ? ' Showing only unassigned supervisors and centers.' : ''}
        </p>

        <div className="form-inline-grid columns-4">
          <label>
            Supervisor
            <select
              value={selectedSupervisorId ?? ''}
              onChange={(e) => setSelectedSupervisorId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select supervisor</option>
              {pickableSupervisors.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                  {row.email ? ` (${row.email})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label>
            Region
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedCenterId(null);
              }}
            >
              <option value="">Select region</option>
              {regions.map((row) => (
                <option key={row.auto} value={row.name || ''}>
                  {row.name || `Region ${row.auto}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            Exam center
            <select
              value={selectedCenterId ?? ''}
              onChange={(e) => setSelectedCenterId(e.target.value ? Number(e.target.value) : null)}
              disabled={!selectedRegion.trim()}
            >
              <option value="">
                {selectedRegion.trim() ? 'Select center' : 'Select region first'}
              </option>
              {pickableCenters.map((row) => (
                <option key={row.id} value={row.id}>
                  {centerOptionLabel(row)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Academic year
            <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
          </label>

          <label>
            Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </label>
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={onlyUnassigned}
            onChange={(e) => setOnlyUnassigned(e.target.checked)}
          />
          Show only unassigned supervisors and centers for the selected year
        </label>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={handleAssign} disabled={saving}>
            {saving ? 'Assigning...' : 'Assign to center'}
          </button>
        </div>
      </section>

      <section className="panel form-card compact-form">
        <h2>Bulk assign from CSV</h2>
        <p className="muted">
          Columns: supervisor_email, supervisor_name, center_name, region, district, academic_year, notes.
          Provide supervisor email or name, and center name (region helps match the right center).
        </p>

        <div className="form-actions">
          <button
            type="button"
            className="btn"
            onClick={() => downloadTemplate(`${level}-assignments-template.csv`, ASSIGNMENT_TEMPLATE)}
          >
            Download assignment template
          </button>
        </div>

        <div className="form-inline-grid columns-2">
          <label>
            Assignment CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportResult(null);
              }}
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={handleImportAssignments} disabled={importing}>
            {importing ? 'Importing...' : 'Upload assignments'}
          </button>
        </div>

        {importResult?.errors.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {importResult.errors.map((row, index) => (
                  <tr key={`${row.row}-${index}`}>
                    <td>{row.row ?? '-'}</td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="panel form-card compact-form">
        <h2>Assignment filters</h2>
        <div className="form-inline-grid columns-4">
          <label>
            Region
            <select
              value={filterRegion}
              onChange={(e) => {
                setFilterRegion(e.target.value);
                setFilterCenterId(null);
              }}
            >
              <option value="">All regions</option>
              {regions.map((row) => (
                <option key={row.auto} value={row.name || ''}>
                  {row.name || `Region ${row.auto}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            Supervisor
            <select
              value={filterSupervisorId ?? ''}
              onChange={(e) => setFilterSupervisorId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All</option>
              {supervisors.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Center
            <select
              value={filterCenterId ?? ''}
              onChange={(e) => setFilterCenterId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All</option>
              {filterableCenters.map((row) => (
                <option key={row.id} value={row.id}>
                  {centerOptionLabel(row)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Academic year
            <input value={filterYear} onChange={(e) => setFilterYear(e.target.value)} />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn" onClick={() => loadAssignments()} disabled={loading}>
            Apply filters
          </button>
        </div>
      </section>

      {info ? <div className="alert alert-success">{info}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">Loading assignments...</p> : null}

      {!loading ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Supervisor</th>
                <th>Center</th>
                <th>Region</th>
                <th>District</th>
                <th>Level</th>
                <th>Students</th>
                <th>Year</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {displayedAssignments.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div>{row.supervisorName || row.supervisorId}</div>
                    {row.supervisorEmail ? <div className="muted small">{row.supervisorEmail}</div> : null}
                  </td>
                  <td>
                    {row.centerId ? (
                      <Link to={`/supervisors/${level}/centers/${row.centerId}`} className="link-btn">
                        {row.centerName || row.centerId}
                      </Link>
                    ) : (
                      row.centerName || '-'
                    )}
                  </td>
                  <td>{row.region || '-'}</td>
                  <td>{row.district || '-'}</td>
                  <td>{row.schoolLevel || '-'}</td>
                  <td>{row.studentCount != null ? row.studentCount.toLocaleString() : '-'}</td>
                  <td>{row.academicYear || '-'}</td>
                  <td className="table-actions">
                    <button type="button" className="btn" onClick={() => handleRemove(row.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

              {!displayedAssignments.length ? (
                <tr>
                  <td colSpan={8} className="muted table-empty">
                    No assignments found.
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

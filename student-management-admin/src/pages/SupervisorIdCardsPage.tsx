import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getApiBaseUrl } from '../api/client';
import { getRegions } from '../api/catalog';
import { getExamCenterSchools } from '../api/examCenters';
import {
  fetchSupervisorPhotoObjectUrl,
  getAssignments,
  getSupervisor,
} from '../api/supervisors';
import { PageHeader } from '../components/PageHeader';
import { SupervisorIdCard, type SupervisorIdCardData } from '../components/SupervisorIdCard';
import {
  DEFAULT_YEAR,
  type Region,
  type School,
  type SupervisorAssignment,
  type SupervisorLevel,
} from '../types';
import { exportElementToPdf, sanitizePdfFilename } from '../utils/exportPdf';

function parseSupervisorLevel(raw?: string): SupervisorLevel | null {
  if (raw === 'primary' || raw === 'secondary') return raw;
  return null;
}

function levelLabel(level: SupervisorLevel): string {
  return level === 'primary' ? 'Primary' : 'Secondary';
}

function supervisorPhotoApiUrl(level: SupervisorLevel, supervisorId: number): string {
  return `${getApiBaseUrl()}/api/supervisors/${level}/${supervisorId}/photo`;
}

export function SupervisorIdCardsPage() {
  const { level: rawLevel } = useParams<{ level: string }>();
  const level = useMemo(() => parseSupervisorLevel(rawLevel), [rawLevel]);
  const previewRef = useRef<HTMLDivElement>(null);
  const exportAreaRef = useRef<HTMLDivElement>(null);

  const [assignments, setAssignments] = useState<SupervisorAssignment[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR);
  const [filterRegion, setFilterRegion] = useState('');
  const [search, setSearch] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);

  const [schools, setSchools] = useState<School[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingCard, setLoadingCard] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<'single' | 'batch'>('single');
  const [exportMode, setExportMode] = useState<'single' | 'batch' | null>(null);

  const [batchPhotos, setBatchPhotos] = useState<Record<number, string | null>>({});
  const [batchSchools, setBatchSchools] = useState<Record<number, School[]>>({});

  const loadAssignments = useCallback(async () => {
    if (!level) return;

    setLoadingList(true);
    setError(null);
    try {
      const [rows, regionRows] = await Promise.all([
        getAssignments(level, { academicYear: academicYear.trim() || undefined }),
        getRegions(),
      ]);
      setAssignments(rows);
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
      const haystack = [row.supervisorName, row.centerName, row.supervisorEmail, row.region]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [assignments, filterRegion, search]);

  useEffect(() => {
    if (!selectedAssignmentId) return;
    if (!filteredAssignments.some((row) => row.id === selectedAssignmentId)) {
      setSelectedAssignmentId(null);
    }
  }, [filteredAssignments, selectedAssignmentId]);

  const selectedAssignment = useMemo(
    () => assignments.find((row) => row.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId]
  );

  useEffect(() => {
    if (!level || !selectedAssignment) {
      setSchools([]);
      setPhotoUrl(null);
      return undefined;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      setLoadingCard(true);
      setError(null);
      try {
        const [schoolRows, supervisorRow] = await Promise.all([
          getExamCenterSchools(level, selectedAssignment.centerId),
          getSupervisor(level, selectedAssignment.supervisorId),
        ]);
        if (cancelled) return;
        setSchools(schoolRows);

        if (supervisorRow.hasPhoto) {
          objectUrl = await fetchSupervisorPhotoObjectUrl(level, selectedAssignment.supervisorId);
          if (!cancelled) setPhotoUrl(objectUrl);
        } else {
          setPhotoUrl(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load ID card details');
          setSchools([]);
          setPhotoUrl(null);
        }
      } finally {
        if (!cancelled) setLoadingCard(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
    };
  }, [level, selectedAssignment]);

  const cardData: SupervisorIdCardData | null = useMemo(() => {
    if (!selectedAssignment || !level) return null;
    return {
      assignmentId: selectedAssignment.id,
      supervisorLevel: level,
      supervisorName: selectedAssignment.supervisorName || `Supervisor #${selectedAssignment.supervisorId}`,
      photoUrl,
      photoApiUrl: supervisorPhotoApiUrl(level, selectedAssignment.supervisorId),
      levelLabel: levelLabel(level),
      centerName: selectedAssignment.centerName || `Center #${selectedAssignment.centerId}`,
      region: selectedAssignment.region,
      academicYear: selectedAssignment.academicYear || academicYear,
      schools,
    };
  }, [academicYear, level, photoUrl, schools, selectedAssignment]);

  async function prepareBatchData() {
    if (!level || !filteredAssignments.length) return;

    const photoEntries = await Promise.all(
      filteredAssignments.map(async (row) => {
        try {
          const supervisor = await getSupervisor(level, row.supervisorId);
          if (!supervisor.hasPhoto) return [row.id, null] as const;
          const url = await fetchSupervisorPhotoObjectUrl(level, row.supervisorId);
          return [row.id, url] as const;
        } catch {
          return [row.id, null] as const;
        }
      })
    );

    const schoolEntries = await Promise.all(
      filteredAssignments.map(async (row) => {
        try {
          const rows = await getExamCenterSchools(level, row.centerId);
          return [row.id, rows] as const;
        } catch {
          return [row.id, []] as const;
        }
      })
    );

    setBatchPhotos(Object.fromEntries(photoEntries));
    setBatchSchools(Object.fromEntries(schoolEntries));
  }

  async function prepareBatchPrint() {
    if (!level || !filteredAssignments.length) return;

    setLoadingCard(true);
    setError(null);
    try {
      await prepareBatchData();
      setPrintMode('batch');
      requestAnimationFrame(() => window.print());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare batch print');
    } finally {
      setLoadingCard(false);
    }
  }

  function handlePrintSingle() {
    setPrintMode('single');
    requestAnimationFrame(() => window.print());
  }

  async function handleExportSinglePdf() {
    if (!previewRef.current || !cardData || !level) return;

    setExportingPdf(true);
    setError(null);
    try {
      const filename = sanitizePdfFilename(
        `${level}-supervisor-id-${cardData.supervisorName}-${academicYear}`
      );
      await exportElementToPdf(previewRef.current, `${filename}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportBatchPdf() {
    if (!level || !filteredAssignments.length) return;

    setLoadingCard(true);
    setExportingPdf(true);
    setError(null);
    try {
      await prepareBatchData();
      setExportMode('batch');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      if (!exportAreaRef.current) {
        throw new Error('Export area is not ready');
      }

      const filename = sanitizePdfFilename(
        `${level}-supervisor-id-cards-${filterRegion.trim() || 'all-regions'}-${academicYear}`
      );
      await exportElementToPdf(exportAreaRef.current, `${filename}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export batch PDF');
    } finally {
      setExportMode(null);
      setExportingPdf(false);
      setLoadingCard(false);
    }
  }

  if (!level) return <Navigate to="/supervisors" replace />;

  return (
    <div className="supervisor-id-cards-page">
      <div className="no-print">
        <PageHeader
          title={`${levelLabel(level)} supervisor ID cards`}
          subtitle="Generate professional identification cards for assigned exam supervisors."
          actions={
            <div className="chip-row">
              <Link to={`/supervisors/${level}/report`} className="btn">
                Supervisors report
              </Link>
              <Link to={`/supervisors/${level}/assignments`} className="btn">
                Center assignments
              </Link>
              <Link to={`/supervisors/${level}/list`} className="btn">
                Supervisors list
              </Link>
            </div>
          }
        />

        <section className="panel form-card compact-form">
          <h2>Process supervisor ID card</h2>
          <p className="muted">
            Select an assigned supervisor to preview their ID card. Cards include the supervisor photo,
            level, exam center, and host schools with student counts.
          </p>

          <div className="form-inline-grid columns-4">
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
                placeholder="Supervisor or center name"
              />
            </label>

            <label>
              Assigned supervisor
              <select
                value={selectedAssignmentId ?? ''}
                onChange={(e) =>
                  setSelectedAssignmentId(e.target.value ? Number(e.target.value) : null)
                }
                disabled={loadingList || !filteredAssignments.length}
              >
                <option value="">
                  {loadingList
                    ? 'Loading assignments...'
                    : filteredAssignments.length
                      ? 'Select supervisor'
                      : 'No assignments found'}
                </option>
                {filteredAssignments.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.supervisorName} - {row.centerName}
                    {row.region ? ` (${row.region})` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn" onClick={() => loadAssignments()} disabled={loadingList}>
              Refresh list
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrintSingle}
              disabled={!cardData || loadingCard}
            >
              Print selected card
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportSinglePdf}
              disabled={!cardData || loadingCard || exportingPdf}
            >
              {exportingPdf ? 'Exporting...' : 'Export selected PDF'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => prepareBatchPrint()}
              disabled={!filteredAssignments.length || loadingCard || exportingPdf}
            >
              {loadingCard ? 'Preparing...' : `Print all (${filteredAssignments.length})`}
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleExportBatchPdf}
              disabled={!filteredAssignments.length || loadingCard || exportingPdf}
            >
              {exportingPdf ? 'Exporting...' : `Export all PDF (${filteredAssignments.length})`}
            </button>
          </div>
        </section>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {loadingList && !assignments.length ? <p className="muted">Loading assignments...</p> : null}
        {!loadingList && !filteredAssignments.length ? (
          <div className="alert alert-error">
            No supervisor center assignments found for {academicYear || DEFAULT_YEAR}.
            Assign supervisors to centers first.
          </div>
        ) : null}

        <section className="panel supervisor-id-preview-panel">
          <h2>ID card preview</h2>
          {loadingCard ? <p className="muted">Loading card details...</p> : null}
          {!loadingCard && !cardData ? (
            <p className="muted">Select an assigned supervisor to preview their ID card.</p>
          ) : null}
          {cardData ? (
            <div ref={previewRef} className="supervisor-id-preview-wrap">
              <SupervisorIdCard {...cardData} />
            </div>
          ) : null}
        </section>
      </div>

      <div className={`supervisor-id-print-area print-mode-${printMode}`}>
        {printMode === 'single' && cardData ? <SupervisorIdCard {...cardData} /> : null}
        {printMode === 'batch'
          ? filteredAssignments.map((row) => (
              <SupervisorIdCard
                key={row.id}
                assignmentId={row.id}
                supervisorLevel={level}
                supervisorName={row.supervisorName || `Supervisor #${row.supervisorId}`}
                photoUrl={batchPhotos[row.id] ?? null}
                photoApiUrl={supervisorPhotoApiUrl(level, row.supervisorId)}
                levelLabel={levelLabel(level)}
                centerName={row.centerName || `Center #${row.centerId}`}
                region={row.region}
                academicYear={row.academicYear || academicYear}
                schools={batchSchools[row.id] ?? []}
              />
            ))
          : null}
      </div>

      <div ref={exportAreaRef} className="supervisor-id-export-area" aria-hidden="true">
        {exportMode === 'batch'
          ? filteredAssignments.map((row) => (
              <SupervisorIdCard
                key={`export-${row.id}`}
                assignmentId={row.id}
                supervisorLevel={level}
                supervisorName={row.supervisorName || `Supervisor #${row.supervisorId}`}
                photoUrl={batchPhotos[row.id] ?? null}
                photoApiUrl={supervisorPhotoApiUrl(level, row.supervisorId)}
                levelLabel={levelLabel(level)}
                centerName={row.centerName || `Center #${row.centerId}`}
                region={row.region}
                academicYear={row.academicYear || academicYear}
                schools={batchSchools[row.id] ?? []}
              />
            ))
          : null}
      </div>
    </div>
  );
}
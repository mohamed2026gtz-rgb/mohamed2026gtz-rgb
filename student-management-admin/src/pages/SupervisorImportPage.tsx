import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  importSupervisorsFromFile,
  importSupervisorsWithPhotosFromFiles,
  type SupervisorImportResult,
} from '../api/supervisors';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import type { SupervisorLevel } from '../types';

function parseSupervisorLevel(raw?: string): SupervisorLevel | null {
  if (raw === 'primary' || raw === 'secondary') return raw;
  return null;
}

function levelLabel(level: SupervisorLevel): string {
  return level === 'primary' ? 'Primary' : 'Secondary';
}

const SUPERVISOR_TEMPLATE = `name,title,mobile,region,email,current_institution,photo_file
Xasan Odowaa Abokor,Kormeere,4380035,Daad-Madheedh,xasan4380035@example.com,,4380035.jpg
Maxamed Nuur Axmed,G/Kuxigeen,4366211,Daad-Madheedh,maxamed4366211@example.com,,4366211.jpg
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

export function SupervisorImportPage() {
  const { level: rawLevel } = useParams<{ level: string }>();
  const level = useMemo(() => parseSupervisorLevel(rawLevel), [rawLevel]);
  const { isRegionScopeUser } = useAuth();
  const regionOnlyImport = isRegionScopeUser;

  const [file, setFile] = useState<File | null>(null);
  const [photosZip, setPhotosZip] = useState<File | null>(null);
  const [createLogins, setCreateLogins] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SupervisorImportResult | null>(null);

  if (!level) return <Navigate to="/supervisors" replace />;

  async function handleUpload(withPhotos: boolean) {
    if (!file) {
      setError('Choose a CSV file first.');
      return;
    }
    if ((withPhotos || regionOnlyImport) && !photosZip) {
      setError('Choose a ZIP file containing supervisor photos.');
      return;
    }
    if (regionOnlyImport && !withPhotos) {
      setError('Region staff must upload supervisors with photos.');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const summary = withPhotos
        ? await importSupervisorsWithPhotosFromFiles(level!, file, photosZip!, { createLogins })
        : await importSupervisorsFromFile(level!, file, { createLogins });
      setResult(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={`Import ${levelLabel(level)} supervisors`}
        subtitle={regionOnlyImport ? "Bulk import supervisors for your region using CSV plus a photos ZIP." : "Upload a CSV list and optionally attach supervisor photos in one step."}
        actions={
          <div className="chip-row">
            <Link to={`/supervisors/${level}/list`} className="btn">
              Back to list
            </Link>
            <Link to={`/supervisors/${level}/assignments`} className="btn">
              Center assignments
            </Link>
          </div>
        }
      />

      <section className="panel form-card">
        <h2>CSV format</h2>
        <p className="muted">
          Required column: <strong>name</strong>. Optional: title, mobile, region, email,
          current_institution, sex, year_of_birth, residency, experience_for_supervision,
          initial_password, photo_file.
        </p>
        <p className="muted">
          For bulk photos, put JPG/PNG files in a ZIP. Photos are matched by{' '}
          <strong>photo_file</strong> column, <strong>mobile</strong> number (e.g. 4380035.jpg),
          or row number (1.jpg, 2.jpg).
          {regionOnlyImport ? " All imported supervisors are saved under your assigned region." : null}
        </p>

        <div className="form-actions">
          <button
            type="button"
            className="btn"
            onClick={() => downloadTemplate(`${level}-supervisors-template.csv`, SUPERVISOR_TEMPLATE)}
          >
            Download template
          </button>
        </div>

        <pre className="code-block">{SUPERVISOR_TEMPLATE.trim()}</pre>
      </section>

      <section className="panel form-card compact-form">
        <h2>Upload files</h2>
        <div className="form-inline-grid columns-2">
          <label>
            CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
                setError(null);
              }}
            />
          </label>

          <label>
            Photos ZIP{regionOnlyImport ? ' *' : ' (optional for CSV-only import)'}
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => {
                setPhotosZip(e.target.files?.[0] ?? null);
                setResult(null);
                setError(null);
              }}
            />
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={createLogins}
              onChange={(e) => setCreateLogins(e.target.checked)}
              disabled={regionOnlyImport}
            />
            Create login accounts when email and initial_password are provided
          </label>
        </div>

        <div className="form-actions">
          {!regionOnlyImport ? (
            <button type="button" className="btn" onClick={() => handleUpload(false)} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload CSV only'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleUpload(true)}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload CSV + photos'}
          </button>
        </div>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {result ? (
        <section className="panel">
          <h2>Import result</h2>
          <p>{result.message}</p>
          <div className="stat-grid compact">
            <div className="stat-card">
              <span className="stat-label">Created</span>
              <strong>{result.created}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Photos attached</span>
              <strong>{result.photosAttached ?? 0}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Skipped</span>
              <strong>{result.skipped}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Logins created</span>
              <strong>{result.loginAccountsCreated ?? 0}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Errors</span>
              <strong>{result.errors.length}</strong>
            </div>
          </div>

          {result.photoWarnings?.length ? (
            <div className="table-wrap">
              <h3>Photo warnings</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Warning</th>
                  </tr>
                </thead>
                <tbody>
                  {result.photoWarnings.map((row, index) => (
                    <tr key={`photo-${row.row}-${index}`}>
                      <td>{row.row ?? '-'}</td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {result.errors.length ? (
            <div className="table-wrap">
              <h3>Import errors</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((row, index) => (
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
      ) : null}
    </div>
  );
}
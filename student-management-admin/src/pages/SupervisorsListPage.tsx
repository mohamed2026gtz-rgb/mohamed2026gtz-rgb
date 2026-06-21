import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  deleteSupervisor,
  fetchSupervisorPhotoObjectUrl,
  getSupervisors,
} from '../api/supervisors';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { normalizeSexValue, sexBadgeClass } from '../utils/supervisorDisplay';
import type { Supervisor, SupervisorLevel } from '../types';

function parseSupervisorLevel(raw?: string): SupervisorLevel | null {
  if (raw === 'primary' || raw === 'secondary') return raw;
  return null;
}

function levelLabel(level: SupervisorLevel): string {
  return level === 'primary' ? 'Primary' : 'Secondary';
}

function SupervisorPhotoCell({
  level,
  supervisor,
}: {
  level: SupervisorLevel;
  supervisor: Supervisor;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (!supervisor.hasPhoto) {
      setPhotoUrl(null);
      return undefined;
    }

    (async () => {
      objectUrl = await fetchSupervisorPhotoObjectUrl(level, supervisor.id);
      if (!cancelled) setPhotoUrl(objectUrl);
    })();

    return () => {
      cancelled = true;
      if (objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
    };
  }, [level, supervisor.hasPhoto, supervisor.id]);

  if (!supervisor.hasPhoto) {
    return <span className="supervisor-photo-missing">No photo</span>;
  }
  if (!photoUrl) return <span className="supervisor-photo-missing">...</span>;

  return (
    <img src={photoUrl} alt={supervisor.name} className="supervisor-photo-thumb" />
  );
}

export function SupervisorsListPage() {
  const { isRegionScopeUser } = useAuth();
  const { level: rawLevel } = useParams<{ level: string }>();
  const level = useMemo(() => parseSupervisorLevel(rawLevel), [rawLevel]);

  const [rows, setRows] = useState<Supervisor[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!level) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getSupervisors(level, query || undefined);
        if (cancelled) return;
        setRows(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load supervisors');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [level, query]);

  if (!level) return <Navigate to="/supervisors" replace />;

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this supervisor?')) return;

    setError(null);
    try {
      await deleteSupervisor(level!, id);
      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete supervisor');
    }
  }

  return (
    <div className="supervisors-page">
      <PageHeader
        title={`${levelLabel(level)} supervisors`}
        subtitle={
          isRegionScopeUser
            ? 'Supervisors registered for your region. Photos are required when adding new records.'
            : 'Search, review, and manage supervisor profiles for exam operations.'
        }
        actions={
          <div className="chip-row">
            {!isRegionScopeUser ? (
              <Link to={`/supervisors/${level}/assignments`} className="btn">
                Center assignments
              </Link>
            ) : null}
            {!isRegionScopeUser ? (
              <Link to={`/supervisors/${level}/import`} className="btn">
                Import list
              </Link>
            ) : (
              <Link to={`/supervisors/${level}/import`} className="btn">
                Bulk import with photos
              </Link>
            )}
            <Link to={`/supervisors/${level}/new`} className="btn btn-primary">
              Add supervisor
            </Link>
          </div>
        }
      />

      <form
        className="supervisor-list-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, region, or institution..."
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        {!loading ? (
          <span className="supervisor-list-count">
            {rows.length.toLocaleString()} supervisor{rows.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </form>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <div className="supervisor-loading">Loading supervisors...</div> : null}

      {!loading ? (
        <div className="supervisor-table-wrap table-wrap">
          <table className="data-table supervisor-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Region</th>
                <th>Sex</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Institution</th>
                <th>Title</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sexLabel = normalizeSexValue(row.sex);
                return (
                  <tr key={row.id}>
                    <td className="supervisor-photo-cell">
                      <SupervisorPhotoCell level={level} supervisor={row} />
                    </td>
                    <td className="supervisor-name-cell">{row.name}</td>
                    <td>{row.region || '—'}</td>
                    <td>
                      {sexLabel ? (
                        <span className={sexBadgeClass(row.sex)}>{sexLabel}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{row.mobile || '—'}</td>
                    <td>{row.email || '—'}</td>
                    <td>{row.currentInstitution || '—'}</td>
                    <td>{row.title || '—'}</td>
                    <td>
                      <div className="supervisor-table-actions table-actions">
                        <Link to={`/supervisors/${level}/${row.id}/edit`} className="link-btn">
                          Edit
                        </Link>
                        {!isRegionScopeUser ? (
                          <button type="button" className="btn" onClick={() => handleDelete(row.id)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={9} className="supervisor-empty-state">
                    No supervisors found. Try a different search or add a new supervisor.
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

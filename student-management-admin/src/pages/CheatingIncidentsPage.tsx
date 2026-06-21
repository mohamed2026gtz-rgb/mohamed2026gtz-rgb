import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteCheatingIncident, getCheatingIncidents } from '../api/examCheating';
import { Pagination } from '../components/Pagination';
import { PageHeader } from '../components/PageHeader';
import type { CheatingIncident, CheatingStatus } from '../types';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: CheatingStatus[] = [
  'Reported',
  'Under investigation',
  'Action taken',
  'Closed',
];

export function CheatingIncidentsPage() {
  const [items, setItems] = useState<CheatingIncident[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('');
  const [status, setStatus] = useState<CheatingStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getCheatingIncidents({
          page,
          pageSize: PAGE_SIZE,
          search: query || undefined,
          region: region.trim() || undefined,
          schoolLevel: schoolLevel.trim() || undefined,
          status: status || undefined,
        });

        if (cancelled) return;
        setItems(result.items);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load incidents');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, query, region, schoolLevel, status]);

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this cheating incident?')) return;

    try {
      await deleteCheatingIncident(id);
      const nextCount = totalCount - 1;
      if (items.length === 1 && page > 1 && nextCount >= 0) {
        setPage((p) => p - 1);
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
      setTotalCount(Math.max(0, nextCount));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete incident');
    }
  }

  return (
    <div>
      <PageHeader
        title="Cheating incidents"
        subtitle="Review and manage exam cheating reports."
        actions={
          <Link to="/cheating/new" className="btn btn-primary">
            New incident
          </Link>
        }
      />

      <form
        className="toolbar wrap"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student, subject, center"
        />
        <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region" />
        <input
          value={schoolLevel}
          onChange={(e) => setSchoolLevel(e.target.value)}
          placeholder="School level"
        />
        <select value={status} onChange={(e) => setStatus((e.target.value as CheatingStatus) || '')}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button type="submit" className="btn">
          Apply
        </button>
      </form>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">Loading incidents...</p> : null}

      {!loading ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.examDate}</td>
                    <td>{item.studentName || item.studentNo}</td>
                    <td>{item.subject}</td>
                    <td>{item.cheatingTypeLabel || item.customTypeLabel || '-'}</td>
                    <td>{item.severity}</td>
                    <td>{item.status}</td>
                    <td className="table-actions">
                      <Link to={`/cheating/${item.id}/edit`} className="link-btn">
                        Edit
                      </Link>
                      <button type="button" className="btn" onClick={() => handleDelete(item.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!items.length ? (
                  <tr>
                    <td colSpan={7} className="muted table-empty">
                      No incidents found.
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
        </>
      ) : null}
    </div>
  );
}
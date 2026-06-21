import { useEffect, useState } from 'react';
import { getTeachers } from '../api/teachers';
import { Pagination } from '../components/Pagination';
import { PageHeader } from '../components/PageHeader';
import type { Teacher } from '../types';

const PAGE_SIZE = 50;

export function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getTeachers({
          page,
          pageSize: PAGE_SIZE,
          search: query || undefined,
        });

        if (cancelled) return;
        setTeachers(result.items);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load teachers');
          setTeachers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, query]);

  return (
    <div>
      <PageHeader title="Teachers" subtitle="Search and browse teacher records." />

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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teacher name, title, or phone"
        />
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">Loading teachers...</p> : null}

      {!loading ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Title</th>
                  <th>Telephone</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={`${teacher.auto}-${teacher.fullName || ''}`}>
                    <td>{teacher.auto}</td>
                    <td>{teacher.fullName || '-'}</td>
                    <td>{teacher.title || '-'}</td>
                    <td>{teacher.telephone || '-'}</td>
                  </tr>
                ))}
                {!teachers.length ? (
                  <tr>
                    <td colSpan={4} className="muted table-empty">
                      No teachers found.
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
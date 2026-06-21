import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listStaffUsers } from '../api/users';
import { scopeLabel, type StaffUser } from '../types';

export function UsersPage() {
  const [items, setItems] = useState<StaffUser[]>([]);
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
        const result = await listStaffUsers({ page, pageSize: 25, search: query });
        if (cancelled) return;
        setItems(result.items);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  return (
    <div className="page">
      <header className="page-header row">
        <div>
          <h1>Staff users</h1>
          <p className="muted">{totalCount.toLocaleString()} users</p>
        </div>
        <Link to="/users/new" className="btn btn-primary">Add user</Link>
      </header>
      <form className="toolbar" onSubmit={handleSearch}>
        <input type="search" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn">Search</button>
      </form>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">Loading...</p> : null}
      {!loading && !error ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Status</th><th>Scope</th><th>Roles</th><th /></tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName || '-'}</td>
                    <td>{user.email || '-'}</td>
                    <td><span className={`badge ${user.status === 'active' ? 'badge-ok' : ''}`}>{user.status || 'unknown'}</span></td>
                    <td>{scopeLabel(user.accessScope)}</td>
                    <td>{user.roles.join(', ')}</td>
                    <td><Link to={`/users/${user.id}/edit`} className="link-btn">Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
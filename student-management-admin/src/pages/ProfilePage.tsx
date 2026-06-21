import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { primaryRoleLabel } from '../types';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your account details, roles, and session controls." />

      <section className="panel">
        <div className="detail-grid">
          <InfoRow label="Full name" value={user?.fullName || null} />
          <InfoRow label="Username" value={user?.userName || null} />
          <InfoRow label="Email" value={user?.email || null} />
          <InfoRow label="Student no" value={user?.studentNo || null} />
          <InfoRow label="Registration no" value={user?.registrationNo || null} />
          <InfoRow label="School" value={user?.schoolName || null} />
          <InfoRow label="Primary role" value={primaryRoleLabel(user)} />
        </div>
      </section>

      <section className="panel">
        <h2>Roles</h2>
        <div className="chip-row">
          {(user?.roles || []).map((role) => (
            <span key={role} className="badge">
              {role}
            </span>
          ))}
          {!user?.roles?.length ? <span className="muted">No roles found.</span> : null}
        </div>
      </section>

      <section className="panel">
        <h2>Session</h2>
        <p className="muted">Use logout when switching users or ending your admin session.</p>
        <div className="form-actions align-start">
          <button type="button" className="btn btn-primary" onClick={logout}>
            Logout
          </button>
        </div>
      </section>
    </div>
  );
}
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { primaryRoleLabel } from '../types';

type NavItem = { to: string; label: string; end?: boolean; icon: string };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', end: true, icon: '◫' },
      { to: '/profile', label: 'Profile', icon: '◉' },
    ],
  },
  {
    title: 'Academic',
    items: [
      { to: '/schools', label: 'Schools', icon: '▣' },
      { to: '/students', label: 'Students', icon: '☰' },
      { to: '/students/photos', label: 'Photo lookup', icon: '◐' },
      { to: '/teachers', label: 'Teachers', icon: '✎' },
      { to: '/attendance', label: 'Attendance', icon: '✓' },
    ],
  },
  {
    title: 'Exam operations',
    items: [
      { to: '/exams', label: 'Exam schedule', icon: '◷' },
      { to: '/cheating', label: 'Cheating reports', icon: '!' },
      { to: '/supervisors', label: 'Supervisors', icon: '◎' },
    ],
  },
];

function userInitials(name?: string | null, email?: string | null) {
  const source = (name || email || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function Layout() {
  const { user, logout, isFullAdminUser } = useAuth();
  const displayName = user?.fullName || user?.email || user?.userName || 'User';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            SMS
          </span>
          <div className="brand-text">
            <strong>Student Management</strong>
            <p>Administration Console</p>
          </div>
        </div>

        <div className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <nav key={group.title} className="nav-group" aria-label={group.title}>
              <p className="nav-title">{group.title}</p>
              <ul className="nav-list">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className="nav-link">
                      <span className="nav-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {isFullAdminUser ? (
            <nav className="nav-group" aria-label="System">
              <p className="nav-title">System</p>
              <ul className="nav-list">
                <li>
                  <NavLink to="/users" className="nav-link">
                    <span className="nav-icon" aria-hidden="true">
                      ⚙
                    </span>
                    <span>Staff users</span>
                  </NavLink>
                </li>
              </ul>
            </nav>
          ) : null}
        </div>

        <div className="sidebar-foot">
          <div className="user-card">
            <span className="user-avatar" aria-hidden="true">
              {userInitials(user?.fullName, user?.email)}
            </span>
            <div className="user-meta">
              <p className="user-name">{displayName}</p>
              <p className="user-role">{primaryRoleLabel(user)}</p>
            </div>
          </div>
          <button type="button" className="btn btn-sidebar" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        <main className="main">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

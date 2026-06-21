import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { ApiError, checkApiHealth, getApiBaseUrl, getApiOverride, setApiOverride } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated, isAdministrationUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrl] = useState(() => getApiOverride() || getApiBaseUrl());
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const health = await checkApiHealth();
      if (cancelled) return;
      setApiStatus(
        health.ok
          ? `Connected to API at ${health.baseUrl}`
          : health.message
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  if (isAuthenticated && isAdministrationUser) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      setApiOverride(apiUrl.trim() || null);
      await login(username, password);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <span className="brand-mark">SMS</span>
        <h1>Student Management System</h1>
        <p>
          Secure administration portal for schools, students, exam attendance, supervisors, and
          staff access management across your regions and centers.
        </p>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <p className="muted">Use your administration email and password.</p>
          {error ? <div className="alert alert-error">{error}</div> : null}
          {apiStatus ? (
            <div className={`alert ${apiStatus.startsWith('Connected') ? 'alert-success' : 'alert-error'}`}>
              {apiStatus}
            </div>
          ) : null}
          <label>
            API server (change if login fails from another computer)
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://192.168.20.12:5103"
            />
          </label>
          <label>
            Username or email
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </div>
  );
}
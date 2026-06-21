import { useEffect, type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getDistricts, getRegions, getSchoolLevels, getSchools } from '../api/catalog';
import { createStaffUser, getScopeTypes, getStaffUser, updateStaffUser } from '../api/users';
import type { District, Region, ScopeTypeOption, School, UserScopeType } from '../types';

function toNumberId(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function validateScope(
  scopeType: UserScopeType | '',
  regionId: number | null,
  districtId: number | null,
  schoolLevel: string | null,
  schoolIds: number[]
): string | null {
  if (!scopeType) return 'Select an access level';
  if (scopeType === 'system_admin') return null;
  if (scopeType === 'region' && !regionId) return 'Select a region';
  if (scopeType === 'district' && !districtId) return 'Select a district';
  if (scopeType === 'school_level' && !schoolLevel) return 'Select a school level';
  if (scopeType === 'school' && !schoolIds.length) return 'Select at least one school';
  return null;
}

export function UserFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scopeOptions, setScopeOptions] = useState<ScopeTypeOption[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('active');
  const [scopeType, setScopeType] = useState<UserScopeType | ''>('');
  const [regionId, setRegionId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [schoolLevel, setSchoolLevel] = useState<string | null>(null);
  const [schoolIds, setSchoolIds] = useState<number[]>([]);
  const [schoolSearch, setSchoolSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [scopeRows, regionRows, levelRows] = await Promise.all([
          getScopeTypes(),
          getRegions(),
          getSchoolLevels(),
        ]);
        setScopeOptions(scopeRows);
        setRegions(regionRows);
        setLevels(levelRows);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load form options');
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      setLoading(true);
      try {
        const user = await getStaffUser(id);
        setName(user.fullName || '');
        setEmail(user.email || '');
        setStatus(user.status || 'active');
        const scope = user.accessScope;
        const fullAdminRole = user.roles.some((role) =>
          ['system admin', 'manager', 'admin', 'administrator'].includes(role.trim().toLowerCase())
        );
        if (scope?.scopeType) {
          setScopeType(scope.scopeType);
          setRegionId(scope.regionId ?? null);
          setDistrictId(scope.districtId ?? null);
          setSchoolLevel(scope.schoolLevel ?? null);
          setSchoolIds(scope.schoolIds ?? []);
        } else if (fullAdminRole) {
          setScopeType('system_admin');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  useEffect(() => {
    if (!regionId) {
      setDistricts([]);
      return;
    }
    (async () => {
      try {
        setDistricts(await getDistricts(regionId));
      } catch {
        setDistricts([]);
      }
    })();
  }, [regionId]);

  useEffect(() => {
    if (scopeType !== 'school' && scopeType !== 'school_level') {
      setSchools([]);
      return;
    }
    (async () => {
      try {
        const rows = await getSchools({
          regionId: regionId ?? undefined,
          level: scopeType === 'school_level' ? schoolLevel ?? undefined : undefined,
          search: schoolSearch.trim() || undefined,
        });
        setSchools(rows);
      } catch {
        setSchools([]);
      }
    })();
  }, [scopeType, regionId, schoolLevel, schoolSearch]);

  const selectedRegion = useMemo(
    () => regions.find((r) => r.auto === regionId),
    [regions, regionId]
  );

  const needsRegion =
    scopeType !== 'system_admin' &&
    (scopeType === 'region' ||
      scopeType === 'district' ||
      scopeType === 'school_level' ||
      scopeType === 'school');
  const needsDistrict = scopeType === 'district';
  const needsLevel = scopeType === 'school_level' || scopeType === 'school';
  const needsSchoolPick = scopeType === 'school';

  function toggleSchool(schoolId: number) {
    setSchoolIds((prev) =>
      prev.includes(schoolId) ? prev.filter((x) => x !== schoolId) : [...prev, schoolId]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!isEdit && password.trim().length < 6) { setError('Password must be at least 6 characters'); return; }
    const scopeError = validateScope(scopeType, regionId, districtId, schoolLevel, schoolIds);
    if (scopeError) { setError(scopeError); return; }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      scopeType: scopeType as UserScopeType,
      ...(scopeType === 'system_admin'
        ? {}
        : {
            regionId: regionId ?? undefined,
            districtId: districtId ?? undefined,
            schoolLevel: schoolLevel ?? undefined,
            schoolIds: scopeType === 'school' ? schoolIds : undefined,
          }),
      forcePasswordChange: true,
      ...(isEdit ? { status } : {}),
      ...(password.trim() ? { password: password.trim() } : {}),
    };

    setSaving(true);
    try {
      if (isEdit && id) await updateStaffUser(id, payload);
      else await createStaffUser({ ...payload, password: password.trim() });
      navigate('/users');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading user...</p>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>{isEdit ? 'Edit staff user' : 'New staff user'}</h1>
        <p className="muted">Create scoped staff or a system admin with full access.</p>
        <Link to="/users" className="muted link-btn">Back to list</Link>
      </header>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <form className="form-card" onSubmit={handleSubmit}>
        <section>
          <h2>Account</h2>
          <label>Full name *<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Email *<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isEdit} /></label>
          <label>{isEdit ? 'New password (optional)' : 'Password *'}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={isEdit ? undefined : 6} required={!isEdit} /></label>
          {isEdit ? (
            <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">active</option><option value="inactive">inactive</option></select></label>
          ) : null}
        </section>
        <section>
          <h2>Access scope</h2>
          <label>Level *
            <select value={scopeType} onChange={(e) => {
              setScopeType(e.target.value as UserScopeType | '');
              setRegionId(null); setDistrictId(null); setSchoolLevel(null); setSchoolIds([]);
            }} required>
              <option value="">Select access level</option>
              {scopeOptions.map((opt) => (<option key={opt.scopeType} value={opt.scopeType}>{opt.label} ({opt.role})</option>))}
            </select>
          </label>
          {scopeType === 'system_admin' ? (
            <p className="muted">
              System admins have full access to all regions, schools, and administration features.
              They are not limited to a region or school scope.
            </p>
          ) : null}
          {needsRegion ? (
            <label>Region *
              <select value={regionId ?? ''} onChange={(e) => { setRegionId(toNumberId(e.target.value)); setDistrictId(null); setSchoolIds([]); }} required>
                <option value="">Select region</option>
                {regions.map((r) => (<option key={r.auto} value={r.auto}>{r.name || `Region ${r.auto}`}</option>))}
              </select>
            </label>
          ) : null}
          {needsDistrict ? (
            <label>District *
              <select value={districtId ?? ''} onChange={(e) => setDistrictId(toNumberId(e.target.value))} required disabled={!regionId}>
                <option value="">Select district</option>
                {districts.map((d) => (<option key={d.auto} value={d.auto}>{d.name || `District ${d.auto}`}</option>))}
              </select>
            </label>
          ) : null}
          {needsLevel ? (
            <label>School level {scopeType === 'school_level' ? '*' : ''}
              <select value={schoolLevel ?? ''} onChange={(e) => { setSchoolLevel(e.target.value || null); setSchoolIds([]); }} required={scopeType === 'school_level'}>
                <option value="">Select level</option>
                {levels.map((level) => (<option key={level} value={level}>{level}</option>))}
              </select>
            </label>
          ) : null}
          {needsSchoolPick ? (
            <div className="school-picker">
              <div className="toolbar">
                <input type="search" placeholder="Filter schools" value={schoolSearch} onChange={(e) => setSchoolSearch(e.target.value)} />
                <span className="muted">{schoolIds.length} selected{selectedRegion ? ` - ${selectedRegion.name}` : ''}</span>
              </div>
              <div className="school-list">
                {schools.length === 0 ? <p className="muted">No schools match. Pick a region first.</p> : schools.map((school) => (
                  <label key={school.schoolId} className="school-row">
                    <input type="checkbox" checked={schoolIds.includes(school.schoolId)} onChange={() => toggleSchool(school.schoolId)} />
                    <span><strong>{school.schoolName}</strong><small>{school.schoolLevel || '-'} - {school.district || '-'}</small></span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </section>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update user' : 'Create user'}</button>
        </div>
      </form>
    </div>
  );
}
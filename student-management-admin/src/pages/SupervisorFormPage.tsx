import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getRegions } from '../api/catalog';
import {
  createSupervisor,
  fetchSupervisorPhotoObjectUrl,
  getSupervisor,
  updateSupervisor,
  uploadSupervisorPhoto,
} from '../api/supervisors';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { resolveScopeFilterDefaults } from '../utils/scopeDefaults';
import { normalizeSexValue } from '../utils/supervisorDisplay';
import type { Region, SupervisorLevel } from '../types';

function parseSupervisorLevel(raw?: string): SupervisorLevel | null {
  if (raw === 'primary' || raw === 'secondary') return raw;
  return null;
}

function levelLabel(level: SupervisorLevel): string {
  return level === 'primary' ? 'Primary' : 'Secondary';
}

export function SupervisorFormPage() {
  const navigate = useNavigate();
  const { isRegionScopeUser, user } = useAuth();
  const { level: rawLevel, id } = useParams<{ level: string; id: string }>();
  const level = useMemo(() => parseSupervisorLevel(rawLevel), [rawLevel]);
  const supervisorId = useMemo(() => {
    const parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [id]);

  const isEdit = Boolean(supervisorId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [mobile, setMobile] = useState('');
  const [yearOfBirth, setYearOfBirth] = useState('');
  const [residency, setResidency] = useState('');
  const [region, setRegion] = useState('');
  const [email, setEmail] = useState('');
  const [currentInstitution, setCurrentInstitution] = useState('');
  const [title, setTitle] = useState('');
  const [experienceForSupervision, setExperienceForSupervision] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [lockRegion, setLockRegion] = useState(false);

  useEffect(() => {
    getRegions()
      .then((regionRows) => {
        setRegions(regionRows);
      })
      .catch(() => setRegions([]));
  }, []);

  useEffect(() => {
    if (!regions.length || !user) return;
    const defaults = resolveScopeFilterDefaults(user, regions);
    if (defaults.lockRegion && defaults.regionName) {
      setRegion(defaults.regionName);
      setLockRegion(true);
    }
  }, [regions, user]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    if (!level || !supervisorId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getSupervisor(level, supervisorId);
        if (cancelled) return;

        setName(row.name || '');
        setSex(normalizeSexValue(row.sex));
        setMobile(row.mobile || '');
        setYearOfBirth(row.yearOfBirth || '');
        setResidency(row.residency || '');
        setRegion(row.region || '');
        setEmail(row.email || '');
        setCurrentInstitution(row.currentInstitution || '');
        setTitle(row.title || '');
        setExperienceForSupervision(row.experienceForSupervision || '');
        setHasPhoto(Boolean(row.hasPhoto));

        if (row.hasPhoto) {
          const objectUrl = await fetchSupervisorPhotoObjectUrl(level, supervisorId);
          if (!cancelled && objectUrl) setPhotoPreviewUrl(objectUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load supervisor');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [level, supervisorId]);

  if (!level) return <Navigate to="/supervisors" replace />;
  if (id && !supervisorId) return <Navigate to={`/supervisors/${level}/list`} replace />;

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file);
    if (photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    if (file) {
      setPhotoPreviewUrl(URL.createObjectURL(file));
      setHasPhoto(true);
    } else if (!isEdit) {
      setPhotoPreviewUrl(null);
      setHasPhoto(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Supervisor name is required.');
      return;
    }
    if (!isEdit && isRegionScopeUser && !photoFile) {
      setError('Supervisor photo is required for region staff.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        sex: sex.trim() || undefined,
        mobile: mobile.trim() || undefined,
        yearOfBirth: yearOfBirth.trim() || undefined,
        residency: residency.trim() || undefined,
        region: region.trim() || undefined,
        email: email.trim() || undefined,
        currentInstitution: currentInstitution.trim() || undefined,
        title: title.trim() || undefined,
        experienceForSupervision: experienceForSupervision.trim() || undefined,
        initialPassword: !isEdit ? initialPassword.trim() || undefined : undefined,
      };

      let savedId = supervisorId;

      if (isEdit && supervisorId) {
        await updateSupervisor(level!, supervisorId, payload);
      } else if (isRegionScopeUser && photoFile) {
        const created = await createSupervisor(level!, payload, photoFile);
        savedId = created.id;
        if (created.message) {
          setSuccess(created.message);
        } else if (created.loginAccountCreated) {
          setSuccess('Supervisor created and linked login account generated.');
        } else {
          setSuccess('Supervisor created successfully.');
        }
      } else {
        const created = await createSupervisor(level!, payload);
        savedId = created.id;
        if (created.message) {
          setSuccess(created.message);
        } else if (created.loginAccountCreated) {
          setSuccess('Supervisor created and linked login account generated.');
        } else {
          setSuccess('Supervisor created successfully.');
        }
      }

      if (photoFile && savedId && !isRegionScopeUser) {
        setUploadingPhoto(true);
        await uploadSupervisorPhoto(level!, savedId, photoFile);
        setUploadingPhoto(false);
      }

      if (isEdit && supervisorId) {
        navigate(`/supervisors/${level}/list`);
        return;
      }

      setName('');
      setSex('');
      setMobile('');
      setYearOfBirth('');
      setResidency('');
      setRegion('');
      setEmail('');
      setCurrentInstitution('');
      setTitle('');
      setExperienceForSupervision('');
      setInitialPassword('');
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      setHasPhoto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save supervisor');
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  }

  if (loading) {
    return (
      <div className="supervisors-page">
        <div className="supervisor-loading">Loading supervisor profile...</div>
      </div>
    );
  }

  return (
    <div className="supervisors-page">
      <PageHeader
        title={`${isEdit ? 'Edit' : 'New'} ${levelLabel(level)} supervisor`}
        subtitle={
          isRegionScopeUser
            ? 'Register a supervisor for your region. A photo is required.'
            : 'Supervisor profile, home region, and photo.'
        }
        actions={
          <Link to={`/supervisors/${level}/list`} className="btn">
            View list
          </Link>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <form className="supervisor-form form-card" onSubmit={handleSubmit}>
        <section className="supervisor-form-section">
          <div className="supervisor-form-section__head">
            <h2>
              Identity photo
              {isRegionScopeUser && !isEdit ? <span className="required-mark"> *</span> : null}
            </h2>
            <p>
              {isRegionScopeUser
                ? 'Upload a clear passport-style photo. New records cannot be saved without a photo.'
                : 'Upload a professional photo for supervisor identification and ID cards.'}
            </p>
          </div>
          <div className="supervisor-photo-upload">
            <div className="supervisor-photo-upload__frame">
              {photoPreviewUrl ? (
                <img src={photoPreviewUrl} alt="Supervisor preview" />
              ) : (
                <div className="supervisor-photo-upload__placeholder">
                  <span className="supervisor-photo-upload__placeholder-icon" aria-hidden="true">
                    👤
                  </span>
                  No photo
                </div>
              )}
            </div>
            <div className="supervisor-photo-upload__meta">
              <h3>Supervisor photograph</h3>
              <p>JPG or PNG recommended. Use a front-facing photo with a plain background.</p>
              <label className="btn btn-primary">
                {hasPhoto ? 'Change photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  hidden
                  onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="supervisor-form-section">
          <div className="supervisor-form-section__head">
            <h2>Personal details</h2>
            <p>Core profile information for the exam supervisor record.</p>
          </div>
          <div className="supervisor-field-grid">
            <div className="supervisor-field supervisor-field--span-2">
              <label htmlFor="supervisor-name">
                Full name <span className="field-required">*</span>
              </label>
              <input
                id="supervisor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="supervisor-field">
              <label htmlFor="supervisor-region">Region</label>
              <select
                id="supervisor-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={lockRegion}
              >
                <option value="">Select region</option>
                {regions.map((row) => (
                  <option key={row.auto} value={row.name || ''}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="supervisor-field">
              <label htmlFor="supervisor-sex">Sex</label>
              <select id="supervisor-sex" value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="">Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="supervisor-field">
              <label htmlFor="supervisor-mobile">Mobile</label>
              <input
                id="supervisor-mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 4380035"
                inputMode="tel"
              />
            </div>
            <div className="supervisor-field">
              <label htmlFor="supervisor-yob">Year of birth</label>
              <input
                id="supervisor-yob"
                type="date"
                value={yearOfBirth}
                onChange={(e) => setYearOfBirth(e.target.value)}
              />
            </div>
            <div className="supervisor-field">
              <label htmlFor="supervisor-residency">Residency</label>
              <input
                id="supervisor-residency"
                value={residency}
                onChange={(e) => setResidency(e.target.value)}
                placeholder="City or district"
              />
            </div>
            <div className="supervisor-field">
              <label htmlFor="supervisor-email">Email</label>
              <input
                id="supervisor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="supervisor-field">
              <label htmlFor="supervisor-institution">Institution</label>
              <input
                id="supervisor-institution"
                value={currentInstitution}
                onChange={(e) => setCurrentInstitution(e.target.value)}
                placeholder="Current workplace"
              />
            </div>
            <div className="supervisor-field">
              <label htmlFor="supervisor-title">Title</label>
              <input
                id="supervisor-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Kormeere, G/Kuxigeen"
              />
            </div>
          </div>
        </section>

        <section className="supervisor-form-section">
          <div className="supervisor-form-section__head">
            <h2>Supervision profile</h2>
            <p>Additional details used for exam supervision assignments.</p>
          </div>
          <div className="supervisor-field-grid supervisor-field-grid--2">
            <div className="supervisor-field supervisor-field--span-2">
              <label htmlFor="supervisor-experience">Experience for supervision</label>
              <textarea
                id="supervisor-experience"
                value={experienceForSupervision}
                onChange={(e) => setExperienceForSupervision(e.target.value)}
                placeholder="Brief summary of supervision experience"
              />
            </div>
            {!isEdit && !isRegionScopeUser ? (
              <div className="supervisor-field supervisor-field--span-2">
                <label htmlFor="supervisor-password">Initial password (optional)</label>
                <input
                  id="supervisor-password"
                  type="password"
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                />
              </div>
            ) : null}
          </div>
        </section>

        <div className="supervisor-form-footer">
          <Link to={`/supervisors/${level}/list`} className="btn">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving || uploadingPhoto}>
            {uploadingPhoto
              ? 'Uploading photo...'
              : saving
                ? 'Saving...'
                : isEdit
                  ? 'Update supervisor'
                  : 'Create supervisor'}
          </button>
        </div>
      </form>
    </div>
  );
}

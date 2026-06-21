import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  createCheatingIncident,
  getCheatingIncident,
  getCheatingTypes,
  updateCheatingIncident,
} from '../api/examCheating';
import { PageHeader } from '../components/PageHeader';
import type { CheatingSeverity, CheatingStatus, CheatingType } from '../types';

const SEVERITY_OPTIONS: CheatingSeverity[] = ['Minor', 'Moderate', 'Serious', 'Severe'];
const STATUS_OPTIONS: CheatingStatus[] = [
  'Reported',
  'Under investigation',
  'Action taken',
  'Closed',
];

export function CheatingFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const incidentId = useMemo(() => {
    const parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [id]);

  const [types, setTypes] = useState<CheatingType[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentNo, setStudentNo] = useState('');
  const [examDate, setExamDate] = useState('');
  const [subject, setSubject] = useState('');
  const [examShift, setExamShift] = useState('');
  const [cheatingTypeId, setCheatingTypeId] = useState<number | null>(null);
  const [customTypeLabel, setCustomTypeLabel] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [invigilatorName, setInvigilatorName] = useState('');
  const [invigilatorAction, setInvigilatorAction] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorAction, setSupervisorAction] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [severity, setSeverity] = useState<CheatingSeverity>('Moderate');
  const [status, setStatus] = useState<CheatingStatus>('Reported');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await getCheatingTypes();
        if (!cancelled) setTypes(rows);
      } catch {
        if (!cancelled) setTypes([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEdit || !incidentId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getCheatingIncident(incidentId);
        if (cancelled) return;

        setStudentNo(row.studentNo || '');
        setExamDate(row.examDate || '');
        setSubject(row.subject || '');
        setExamShift(row.examShift != null ? String(row.examShift) : '');
        setCheatingTypeId(row.cheatingTypeId ?? null);
        setCustomTypeLabel(row.customTypeLabel || '');
        setIncidentDescription(row.incidentDescription || '');
        setEvidenceNotes(row.evidenceNotes || '');
        setInvigilatorName(row.invigilatorName || '');
        setInvigilatorAction(row.invigilatorAction || '');
        setSupervisorName(row.supervisorName || '');
        setSupervisorAction(row.supervisorAction || '');
        setActionTaken(row.actionTaken || '');
        setFollowUpNotes(row.followUpNotes || '');
        setSeverity(row.severity || 'Moderate');
        setStatus(row.status || 'Reported');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load incident');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [incidentId, isEdit]);

  if (isEdit && !incidentId) {
    return <Navigate to="/cheating" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentNo.trim()) {
      setError('Student number is required.');
      return;
    }
    if (!examDate.trim()) {
      setError('Exam date is required.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!incidentDescription.trim()) {
      setError('Incident description is required.');
      return;
    }

    const shiftNumber = Number(examShift);

    const payload = {
      studentNo: studentNo.trim(),
      examDate: examDate.trim(),
      subject: subject.trim(),
      incidentDescription: incidentDescription.trim(),
      examShift: Number.isFinite(shiftNumber) && shiftNumber > 0 ? shiftNumber : undefined,
      cheatingTypeId: cheatingTypeId || undefined,
      customTypeLabel: customTypeLabel.trim() || undefined,
      evidenceNotes: evidenceNotes.trim() || undefined,
      invigilatorName: invigilatorName.trim() || undefined,
      invigilatorAction: invigilatorAction.trim() || undefined,
      supervisorName: supervisorName.trim() || undefined,
      supervisorAction: supervisorAction.trim() || undefined,
      actionTaken: actionTaken.trim() || undefined,
      followUpNotes: followUpNotes.trim() || undefined,
      severity,
      status,
    };

    setSaving(true);
    try {
      if (isEdit && incidentId) {
        await updateCheatingIncident(incidentId, payload);
      } else {
        await createCheatingIncident(payload);
      }
      navigate('/cheating');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save incident');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading incident...</p>;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit cheating incident' : 'New cheating incident'}
        subtitle="Create or update exam cheating reports."
        actions={
          <Link to="/cheating" className="btn">
            Back to list
          </Link>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <form className="form-card" onSubmit={handleSubmit}>
        <section>
          <h2>Core details</h2>
          <div className="form-inline-grid columns-4">
            <label>
              Student number *
              <input value={studentNo} onChange={(e) => setStudentNo(e.target.value)} required />
            </label>
            <label>
              Exam date *
              <input value={examDate} onChange={(e) => setExamDate(e.target.value)} placeholder="YYYY-MM-DD" required />
            </label>
            <label>
              Subject *
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </label>
            <label>
              Exam shift
              <input value={examShift} onChange={(e) => setExamShift(e.target.value)} placeholder="1" />
            </label>
          </div>
        </section>

        <section>
          <h2>Classification</h2>
          <div className="form-inline-grid columns-4">
            <label>
              Cheating type
              <select
                value={cheatingTypeId ?? ''}
                onChange={(e) => setCheatingTypeId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select type</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Custom type
              <input value={customTypeLabel} onChange={(e) => setCustomTypeLabel(e.target.value)} />
            </label>
            <label>
              Severity
              <select
                value={severity}
                onChange={(e) => setSeverity((e.target.value as CheatingSeverity) || 'Moderate')}
              >
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={status}
                onChange={(e) => setStatus((e.target.value as CheatingStatus) || 'Reported')}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section>
          <h2>Notes and actions</h2>
          <label>
            Incident description *
            <input
              value={incidentDescription}
              onChange={(e) => setIncidentDescription(e.target.value)}
              required
            />
          </label>
          <div className="form-inline-grid columns-3">
            <label>
              Evidence notes
              <input value={evidenceNotes} onChange={(e) => setEvidenceNotes(e.target.value)} />
            </label>
            <label>
              Invigilator name
              <input value={invigilatorName} onChange={(e) => setInvigilatorName(e.target.value)} />
            </label>
            <label>
              Invigilator action
              <input value={invigilatorAction} onChange={(e) => setInvigilatorAction(e.target.value)} />
            </label>
            <label>
              Supervisor name
              <input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} />
            </label>
            <label>
              Supervisor action
              <input value={supervisorAction} onChange={(e) => setSupervisorAction(e.target.value)} />
            </label>
            <label>
              Final action taken
              <input value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} />
            </label>
          </div>
          <label>
            Follow-up notes
            <input value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} />
          </label>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update incident' : 'Create incident'}
          </button>
        </div>
      </form>
    </div>
  );
}
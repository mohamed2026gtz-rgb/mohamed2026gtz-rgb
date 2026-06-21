import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createExamSubject,
  createExamTimetableEntry,
  deleteExamSubject,
  deleteExamTimetableEntry,
  getExamSubjects,
  getExamTimetable,
  updateExamSubject,
  updateExamTimetableEntry,
} from '../api/examSchedule';
import { PageHeader } from '../components/PageHeader';
import { DEFAULT_YEAR, EXAM_CATALOG_LEVELS, type ExamSubject, type ExamTimetableEntry } from '../types';

type ExamTab = 'subjects' | 'timetable';

export function ExamsPage() {
  const [tab, setTab] = useState<ExamTab>('subjects');
  const [selectedLevel, setSelectedLevel] = useState<string>(EXAM_CATALOG_LEVELS[0]);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [timetable, setTimetable] = useState<ExamTimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newPaperLabel, setNewPaperLabel] = useState('');

  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState('');
  const [editingSubjectCode, setEditingSubjectCode] = useState('');
  const [editingPaperLabel, setEditingPaperLabel] = useState('');
  const [editingSortOrder, setEditingSortOrder] = useState<number>(1);
  const [editingSubjectActive, setEditingSubjectActive] = useState(true);

  const [newExamDate, setNewExamDate] = useState('');
  const [newExamShift, setNewExamShift] = useState(1);
  const [newExamSubjectId, setNewExamSubjectId] = useState<number | null>(null);
  const [newExamNotes, setNewExamNotes] = useState('');

  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingEntryDate, setEditingEntryDate] = useState('');
  const [editingEntryShift, setEditingEntryShift] = useState(1);
  const [editingEntrySubjectId, setEditingEntrySubjectId] = useState<number | null>(null);
  const [editingEntryNotes, setEditingEntryNotes] = useState('');

  const subjectLookup = useMemo(() => {
    const map = new Map<number, ExamSubject>();
    subjects.forEach((subject) => map.set(subject.id, subject));
    return map;
  }, [subjects]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subjectRows, timetableRows] = await Promise.all([
        getExamSubjects({ level: selectedLevel, academicYear: DEFAULT_YEAR }),
        getExamTimetable({ level: selectedLevel, academicYear: DEFAULT_YEAR }),
      ]);

      setSubjects(subjectRows);
      setTimetable(timetableRows);
      if (newExamSubjectId && !subjectRows.some((subject) => subject.id === newExamSubjectId)) {
        setNewExamSubjectId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam data');
    } finally {
      setLoading(false);
    }
  }, [newExamSubjectId, selectedLevel]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleCreateSubject() {
    if (!newSubjectName.trim()) {
      setError('Subject name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createExamSubject({
        schoolLevel: selectedLevel,
        subjectName: newSubjectName.trim(),
        subjectCode: newSubjectCode.trim() || undefined,
        paperLabel: newPaperLabel.trim() || undefined,
        sortOrder: subjects.length + 1,
      });

      setNewSubjectName('');
      setNewSubjectCode('');
      setNewPaperLabel('');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subject');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSubject() {
    if (!editingSubjectId) return;
    if (!editingSubjectName.trim()) {
      setError('Subject name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateExamSubject(editingSubjectId, {
        subjectName: editingSubjectName.trim(),
        subjectCode: editingSubjectCode.trim() || '',
        paperLabel: editingPaperLabel.trim() || '',
        sortOrder: editingSortOrder,
        isActive: editingSubjectActive,
      });

      setEditingSubjectId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subject');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSubject(id: number) {
    setSaving(true);
    setError(null);
    try {
      await deleteExamSubject(id);
      if (editingSubjectId === id) setEditingSubjectId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subject');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTimetableEntry() {
    if (!newExamDate.trim()) {
      setError('Exam date is required.');
      return;
    }
    if (!newExamSubjectId) {
      setError('Select a subject for the timetable entry.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createExamTimetableEntry({
        schoolLevel: selectedLevel,
        examDate: newExamDate.trim(),
        examShift: newExamShift,
        subjectId: newExamSubjectId,
        notes: newExamNotes.trim() || undefined,
      });

      setNewExamDate('');
      setNewExamShift(1);
      setNewExamSubjectId(null);
      setNewExamNotes('');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create timetable entry');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTimetableEntry() {
    if (!editingEntryId) return;
    if (!editingEntryDate.trim() || !editingEntrySubjectId) {
      setError('Exam date and subject are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateExamTimetableEntry(editingEntryId, {
        examDate: editingEntryDate.trim(),
        examShift: editingEntryShift,
        subjectId: editingEntrySubjectId,
        notes: editingEntryNotes.trim() || '',
      });
      setEditingEntryId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update timetable entry');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTimetableEntry(id: number) {
    setSaving(true);
    setError(null);
    try {
      await deleteExamTimetableEntry(id);
      if (editingEntryId === id) setEditingEntryId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete timetable entry');
    } finally {
      setSaving(false);
    }
  }

  function beginEditSubject(subject: ExamSubject) {
    setEditingSubjectId(subject.id);
    setEditingSubjectName(subject.subjectName);
    setEditingSubjectCode(subject.subjectCode || '');
    setEditingPaperLabel(subject.paperLabel || '');
    setEditingSortOrder(subject.sortOrder || 1);
    setEditingSubjectActive(subject.isActive);
  }

  function beginEditTimetable(entry: ExamTimetableEntry) {
    setEditingEntryId(entry.id);
    setEditingEntryDate(entry.examDate);
    setEditingEntryShift(entry.examShift);
    setEditingEntrySubjectId(entry.subjectId);
    setEditingEntryNotes(entry.notes || '');
  }

  return (
    <div>
      <PageHeader
        title="Exams"
        subtitle="Manage exam subjects and timetable entries for attendance sessions."
      />

      <div className="tab-row">
        <button
          type="button"
          className={`tab-btn ${tab === 'subjects' ? 'active' : ''}`}
          onClick={() => setTab('subjects')}
        >
          Subjects CRUD
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'timetable' ? 'active' : ''}`}
          onClick={() => setTab('timetable')}
        >
          Timetable CRUD
        </button>
      </div>

      <div className="level-chip-row">
        {EXAM_CATALOG_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            className={`level-chip ${selectedLevel === level ? 'active' : ''}`}
            onClick={() => setSelectedLevel(level)}
          >
            {level}
          </button>
        ))}
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">Loading exam data...</p> : null}

      {!loading && tab === 'subjects' ? (
        <>
          <section className="panel form-card compact-form">
            <h2>Add subject</h2>
            <div className="form-inline-grid columns-3">
              <label>
                Subject name
                <input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} />
              </label>
              <label>
                Subject code
                <input value={newSubjectCode} onChange={(e) => setNewSubjectCode(e.target.value)} />
              </label>
              <label>
                Paper label
                <input value={newPaperLabel} onChange={(e) => setNewPaperLabel(e.target.value)} />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={handleCreateSubject} disabled={saving}>
                {saving ? 'Saving...' : 'Add subject'}
              </button>
            </div>
          </section>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Paper</th>
                  <th>Sort</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => {
                  const isEditing = editingSubjectId === subject.id;
                  return (
                    <tr key={subject.id}>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingSubjectName}
                            onChange={(e) => setEditingSubjectName(e.target.value)}
                          />
                        ) : (
                          subject.subjectName
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingSubjectCode}
                            onChange={(e) => setEditingSubjectCode(e.target.value)}
                          />
                        ) : (
                          subject.subjectCode || '-'
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingPaperLabel}
                            onChange={(e) => setEditingPaperLabel(e.target.value)}
                          />
                        ) : (
                          subject.paperLabel || '-'
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingSortOrder}
                            onChange={(e) => setEditingSortOrder(Number(e.target.value) || 1)}
                          />
                        ) : (
                          subject.sortOrder
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <label className="checkbox-inline">
                            <input
                              type="checkbox"
                              checked={editingSubjectActive}
                              onChange={(e) => setEditingSubjectActive(e.target.checked)}
                            />
                            <span>{editingSubjectActive ? 'Active' : 'Inactive'}</span>
                          </label>
                        ) : subject.isActive ? (
                          'Yes'
                        ) : (
                          'No'
                        )}
                      </td>
                      <td className="table-actions">
                        {isEditing ? (
                          <>
                            <button type="button" className="btn" onClick={handleUpdateSubject} disabled={saving}>
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => setEditingSubjectId(null)}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn" onClick={() => beginEditSubject(subject)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleDeleteSubject(subject.id)}
                              disabled={saving}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {!loading && tab === 'timetable' ? (
        <>
          <section className="panel form-card compact-form">
            <h2>Add timetable entry</h2>
            <div className="form-inline-grid columns-4">
              <label>
                Exam date
                <input
                  placeholder="YYYY-MM-DD"
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                />
              </label>
              <label>
                Shift
                <select
                  value={newExamShift}
                  onChange={(e) => setNewExamShift(Number(e.target.value) || 1)}
                >
                  <option value={1}>1st shift</option>
                  <option value={2}>2nd shift</option>
                </select>
              </label>
              <label>
                Subject
                <select
                  value={newExamSubjectId || ''}
                  onChange={(e) => setNewExamSubjectId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subjectName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <input value={newExamNotes} onChange={(e) => setNewExamNotes(e.target.value)} />
              </label>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateTimetableEntry}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Add timetable entry'}
              </button>
            </div>
          </section>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Subject</th>
                  <th>Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {timetable.map((entry) => {
                  const isEditing = editingEntryId === entry.id;
                  return (
                    <tr key={entry.id}>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingEntryDate}
                            onChange={(e) => setEditingEntryDate(e.target.value)}
                          />
                        ) : (
                          entry.examDate
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            value={editingEntryShift}
                            onChange={(e) => setEditingEntryShift(Number(e.target.value) || 1)}
                          >
                            <option value={1}>1st shift</option>
                            <option value={2}>2nd shift</option>
                          </select>
                        ) : (
                          entry.examShiftLabel
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            value={editingEntrySubjectId || ''}
                            onChange={(e) =>
                              setEditingEntrySubjectId(e.target.value ? Number(e.target.value) : null)
                            }
                          >
                            <option value="">Select subject</option>
                            {subjects.map((subject) => (
                              <option key={subject.id} value={subject.id}>
                                {subject.subjectName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          subjectLookup.get(entry.subjectId)?.subjectName || entry.subjectName
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editingEntryNotes}
                            onChange={(e) => setEditingEntryNotes(e.target.value)}
                          />
                        ) : (
                          entry.notes || '-'
                        )}
                      </td>
                      <td className="table-actions">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="btn"
                              onClick={handleUpdateTimetableEntry}
                              disabled={saving}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => setEditingEntryId(null)}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn" onClick={() => beginEditTimetable(entry)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleDeleteTimetableEntry(entry.id)}
                              disabled={saving}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
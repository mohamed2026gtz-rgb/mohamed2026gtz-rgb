import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getStudent, getStudentPhotoBlob } from '../api/students';
import { PageHeader } from '../components/PageHeader';
import { blobToObjectUrl, revokeObjectUrl } from '../utils/photos';
import type { Student } from '../types';

export function StudentPhotoLookupPage() {
  const [searchParams] = useSearchParams();
  const [studentNo, setStudentNo] = useState(searchParams.get('studentNo') || '');
  const [student, setStudent] = useState<Student | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      revokeObjectUrl(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    if (searchParams.get('studentNo')) {
      handleLookup(searchParams.get('studentNo') || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLookup(input?: string) {
    const candidate = (input ?? studentNo).trim();
    if (!candidate) {
      setError('Enter student number / unique ID first.');
      return;
    }

    setLoading(true);
    setError(null);
    setStudent(null);
    revokeObjectUrl(photoUrl);
    setPhotoUrl(null);

    try {
      const row = await getStudent(candidate);
      setStudent(row);
      if (!row.hasPicture) {
        setError('This student has no photo on record.');
        return;
      }

      const blob = await getStudentPhotoBlob(row.studentNo);
      setPhotoUrl(blobToObjectUrl(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Student not found');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Student photo lookup"
        subtitle="Search by unique ID or student number to view photo and profile data."
      />

      <div className="panel form-card">
        <label>
          Student number / unique ID
          <input
            value={studentNo}
            onChange={(e) => setStudentNo(e.target.value)}
            placeholder="e.g. 19-286737"
          />
        </label>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={() => handleLookup()} disabled={loading}>
            {loading ? 'Looking up...' : 'View student'}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {student ? (
        <section className="panel photo-lookup-card">
          <h2>{student.fullName || student.studentNo}</h2>
          <p className="muted">Student No: {student.studentNo}</p>
          <p className="muted">Sex: {student.sex || '-'}</p>
          <p className="muted">Level: {student.schoolLevel || student.level || '-'}</p>
          {photoUrl ? <img src={photoUrl} alt={student.fullName || student.studentNo} className="photo-preview" /> : null}
        </section>
      ) : null}
    </div>
  );
}
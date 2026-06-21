import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStudent, getStudentPhotoBlob, getTranscript } from '../api/students';
import { PageHeader } from '../components/PageHeader';
import { blobToObjectUrl, revokeObjectUrl } from '../utils/photos';
import type { Student, StudentTranscript } from '../types';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StudentDetailPage() {
  const { studentNo } = useParams<{ studentNo: string }>();
  const decodedStudentNo = useMemo(() => decodeURIComponent(studentNo || ''), [studentNo]);

  const [student, setStudent] = useState<Student | null>(null);
  const [transcript, setTranscript] = useState<StudentTranscript | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!decodedStudentNo) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [studentRow, transcriptRow] = await Promise.all([
          getStudent(decodedStudentNo),
          getTranscript(decodedStudentNo).catch(() => null),
        ]);

        if (cancelled) return;
        setStudent(studentRow);
        setTranscript(transcriptRow);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load student detail');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [decodedStudentNo]);

  useEffect(() => {
    return () => {
      revokeObjectUrl(photoUrl);
    };
  }, [photoUrl]);

  async function handleLoadPhoto() {
    if (!decodedStudentNo) return;

    setLoadingPhoto(true);
    try {
      const blob = await getStudentPhotoBlob(decodedStudentNo);
      const url = blobToObjectUrl(blob);
      revokeObjectUrl(photoUrl);
      setPhotoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student photo');
    } finally {
      setLoadingPhoto(false);
    }
  }

  if (loading) return <p className="muted">Loading student detail...</p>;
  if (error && !student) return <div className="alert alert-error">{error}</div>;
  if (!student) return <p className="muted">Student not found.</p>;

  return (
    <div>
      <PageHeader
        title={student.fullName || student.studentNo}
        subtitle={`Student detail for ${student.studentNo}`}
        actions={
          <Link to={`/students/photos?studentNo=${encodeURIComponent(student.studentNo)}`} className="btn">
            Open photo lookup
          </Link>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="panel-grid">
        <section className="panel">
          <h2>Profile</h2>
          <div className="detail-grid">
            <InfoRow label="Student No" value={student.studentNo} />
            <InfoRow label="Registration No" value={student.registrationNo} />
            <InfoRow label="Sex" value={student.sex} />
            <InfoRow label="Year of birth" value={student.yearOfBirth} />
            <InfoRow label="School" value={student.schoolName} />
            <InfoRow label="Class" value={student.classId} />
            <InfoRow label="Level" value={student.schoolLevel || student.level} />
            <InfoRow label="Status" value={student.status} />
            <InfoRow label="Phone" value={student.studentTell} />
            <InfoRow label="Address" value={student.studentAddress} />
          </div>
        </section>

        <section className="panel">
          <h2>Photo</h2>
          {student.hasPicture ? (
            <div className="photo-panel">
              <button type="button" className="btn" onClick={handleLoadPhoto} disabled={loadingPhoto}>
                {loadingPhoto ? 'Loading photo...' : photoUrl ? 'Reload photo' : 'Load photo'}
              </button>
              {photoUrl ? <img src={photoUrl} alt={student.fullName || student.studentNo} className="photo-preview" /> : null}
            </div>
          ) : (
            <p className="muted">No photo on record.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Transcript</h2>
        {transcript?.enrollmentHistory?.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Term 1</th>
                  <th>Term 2</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transcript.enrollmentHistory.map((row, index) => (
                  <tr key={`${row.year}-${index}`}>
                    <td>{row.year || '-'}</td>
                    <td>{row.class || '-'}</td>
                    <td>{row.section || '-'}</td>
                    <td>{row.term1Total || '-'}</td>
                    <td>{row.term2Total || '-'}</td>
                    <td>{row.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No transcript records available.</p>
        )}
      </section>
    </div>
  );
}
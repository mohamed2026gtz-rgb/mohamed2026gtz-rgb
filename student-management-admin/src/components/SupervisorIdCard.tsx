import { useEffect, useState } from 'react';
import type { School, SupervisorLevel } from '../types';
import { resolveSupervisorQrDataUrl } from '../utils/supervisorIdQr';

const CHAIRMAN_NAME = 'Daud Ahmed Faarah';
const CHAIRMAN_TITLE = 'Chairman, Somaliland National Examination & Certification Board';

export interface SupervisorIdCardData {
  assignmentId: number;
  supervisorLevel: SupervisorLevel;
  supervisorName: string;
  photoUrl: string | null;
  photoApiUrl?: string | null;
  levelLabel: string;
  centerName: string;
  region?: string | null;
  academicYear?: string;
  schools: Pick<School, 'schoolName' | 'schoolNumber' | 'studentCount'>[];
}

interface Props extends SupervisorIdCardData {
  className?: string;
}

export function SupervisorIdCard({
  assignmentId,
  supervisorLevel,
  supervisorName,
  photoUrl,
  levelLabel,
  centerName,
  region,
  academicYear,
  schools,
  className = '',
}: Props) {
  const totalStudents = schools.reduce((sum, row) => sum + (row.studentCount ?? 0), 0);
  const cardTitle = `${levelLabel} Examination Supervisor ID Card`;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    resolveSupervisorQrDataUrl({
      level: supervisorLevel,
      assignmentId,
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [assignmentId, supervisorLevel]);

  return (
    <article className={`supervisor-id-card ${className}`.trim()} aria-label={`ID card for ${supervisorName}`}>
      <div className="supervisor-id-card__content">
        <section className="supervisor-id-card__profile">
          <h2 className="supervisor-id-card__title">{cardTitle}</h2>
          {academicYear ? (
            <p className="supervisor-id-card__credential-year">Academic Year {academicYear}</p>
          ) : null}
          <div className="supervisor-id-card__photo-frame">
            <div className="supervisor-id-card__photo-wrap">
              {photoUrl ? (
                <img src={photoUrl} alt={supervisorName} className="supervisor-id-card__photo" />
              ) : (
                <div className="supervisor-id-card__photo-placeholder">Photo</div>
              )}
            </div>
          </div>
          <h3 className="supervisor-id-card__name">{supervisorName}</h3>
        </section>

        <section className="supervisor-id-card__center-block">
          <p className="supervisor-id-card__section-title">Exam Center</p>
          <p className="supervisor-id-card__center-name">{centerName}</p>
          {region ? <p className="supervisor-id-card__center-meta">{region}</p> : null}
        </section>

        <section className="supervisor-id-card__schools">
          <div className="supervisor-id-card__schools-head">
            <p className="supervisor-id-card__section-title">Host Schools</p>
            <span className="supervisor-id-card__schools-meta">
              {schools.length} school{schools.length === 1 ? '' : 's'}
              {totalStudents > 0 ? ` | ${totalStudents.toLocaleString()} students` : ''}
            </span>
          </div>
          <div className="supervisor-id-card__school-table-wrap">
            <table className="supervisor-id-card__school-table">
              <thead>
                <tr>
                  <th scope="col">School</th>
                  <th scope="col">No.</th>
                  <th scope="col">Students</th>
                </tr>
              </thead>
              <tbody>
                {schools.length ? (
                  schools.map((school) => (
                    <tr key={`${school.schoolNumber || school.schoolName}`}>
                      <td className="supervisor-id-card__school-name">
                        {school.schoolName || 'Unnamed school'}
                      </td>
                      <td className="supervisor-id-card__school-no">{school.schoolNumber || '-'}</td>
                      <td className="supervisor-id-card__school-count">
                        {(school.studentCount ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="supervisor-id-card__school-empty">
                      No schools linked to this center
                    </td>
                  </tr>
                )}
              </tbody>
              {schools.length ? (
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total students</td>
                    <td>{totalStudents.toLocaleString()}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>

        <footer className="supervisor-id-card__footer">
          <div className="supervisor-id-card__signature">
            <p className="supervisor-id-card__signature-name">{CHAIRMAN_NAME}</p>
            <div className="supervisor-id-card__signature-line" aria-hidden="true" />
            <p className="supervisor-id-card__signature-title">{CHAIRMAN_TITLE}</p>
          </div>

          <div className="supervisor-id-card__qr">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Verification QR for ${supervisorName}`}
                className="supervisor-id-card__qr-image"
              />
            ) : (
              <div className="supervisor-id-card__qr-placeholder" aria-hidden="true" />
            )}
            <p className="supervisor-id-card__qr-caption">Scan to verify</p>
          </div>
        </footer>
      </div>
    </article>
  );
}
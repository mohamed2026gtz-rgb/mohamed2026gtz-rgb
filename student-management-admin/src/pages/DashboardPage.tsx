import { useEffect, useState } from 'react';
import { getDashboardAttendanceStats, getDashboardStats } from '../api/dashboard';
import { PageHeader } from '../components/PageHeader';
import type { AdminAttendanceStats, DashboardStats } from '../types';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</strong>
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendance, setAttendance] = useState<AdminAttendanceStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [statsData, attendanceData] = await Promise.all([
          getDashboardStats(),
          getDashboardAttendanceStats().catch(() => null),
        ]);
        if (cancelled) return;
        setStats(statsData);
        setAttendance(attendanceData);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="muted">Loading dashboard...</p>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return null;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="System totals and exam attendance overview" />

      <div className="stat-grid">
        <StatCard label="Students" value={stats.totalStudents} />
        <StatCard label="Schools" value={stats.totalSchools} />
        <StatCard label="Teachers" value={stats.totalTeachers} />
        <StatCard label="Students with photo" value={stats.studentsWithPicture} />
        <StatCard label="Present today" value={stats.presentToday} />
        <StatCard label="Absent today" value={stats.absentToday} />
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h2>Schools by level</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {stats.schoolsByLevel.map((row) => (
                <tr key={row.level}>
                  <td>{row.level}</td>
                  <td>{row.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2>Students by school level</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {stats.studentsBySchoolLevel.map((row) => (
                <tr key={row.level}>
                  <td>{row.level}</td>
                  <td>{row.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="panel">
        <h2>Regions summary</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Schools</th>
                <th>Students</th>
              </tr>
            </thead>
            <tbody>
              {stats.regionsSummary.map((row) => (
                <tr key={row.region}>
                  <td>{row.region}</td>
                  <td>{row.schoolCount.toLocaleString()}</td>
                  <td>{row.studentCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {attendance ? (
        <>
          <PageHeader
            title="Exam attendance stats"
            subtitle="Attendance percentage by region, level, and exam day"
          />

          <div className="stat-grid">
            <StatCard label="Students with records" value={attendance.summary.studentsWithRecords} />
            <StatCard
              label="Attendance percent"
              value={`${attendance.summary.attendancePercent.toFixed(1)}%`}
            />
            <StatCard
              label="Coverage percent"
              value={`${attendance.summary.coveragePercent.toFixed(1)}%`}
            />
            <StatCard label="Exam days recorded" value={attendance.summary.examDaysRecorded} />
            <StatCard label="Present count" value={attendance.summary.attendedCount} />
            <StatCard label="Absent count" value={attendance.summary.absentCount} />
          </div>

          <div className="panel-grid">
            <section className="panel">
              <h2>By region</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Region</th>
                      <th>Recorded</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.byRegion.map((row) => (
                      <tr key={row.region}>
                        <td>{row.region}</td>
                        <td>
                          {row.studentsWithRecords.toLocaleString()} / {row.totalStudents.toLocaleString()}
                        </td>
                        <td>{row.attendancePercent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <h2>By level</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Coverage %</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.byLevel.map((row) => (
                      <tr key={row.level}>
                        <td>{row.level}</td>
                        <td>{row.coveragePercent.toFixed(1)}%</td>
                        <td>{row.attendancePercent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="panel">
            <h2>By exam day</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Students</th>
                    <th>Subjects</th>
                    <th>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.byExamDay.map((row) => (
                    <tr key={row.examDate}>
                      <td>{row.examDate}</td>
                      <td>{row.students.toLocaleString()}</td>
                      <td>{row.subjects.toLocaleString()}</td>
                      <td>{row.attendancePercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
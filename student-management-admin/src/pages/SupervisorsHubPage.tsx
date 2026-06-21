import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';

function HubCard({
  title,
  description,
  level,
  regionUser,
}: {
  title: string;
  description: string;
  level: 'primary' | 'secondary';
  regionUser: boolean;
}) {
  const isPrimary = level === 'primary';

  return (
    <section
      className={`supervisor-hub-card panel${isPrimary ? '' : ' supervisor-hub-card--secondary'}`}
    >
      <div className="supervisor-hub-card__body">
        <span className="supervisor-hub-card__badge">
          {isPrimary ? 'Primary exams' : 'Secondary exams'}
        </span>
        <h2 className="supervisor-hub-card__title">{title}</h2>
        <p className="supervisor-hub-card__desc">{description}</p>
        <div className="supervisor-hub-card__actions">
          <Link to={`/supervisors/${level}/list`} className="btn btn-primary">
            Supervisors list
          </Link>
          <Link to={`/supervisors/${level}/new`} className="btn btn-primary">
            Add supervisor
          </Link>
          {regionUser ? (
            <Link to={`/supervisors/${level}/import`} className="btn">
              Bulk import with photos
            </Link>
          ) : (
            <>
              <Link to={`/supervisors/${level}/assignments`} className="btn">
                Center assignments
              </Link>
              <Link to={`/supervisors/${level}/id-cards`} className="btn">
                ID cards
              </Link>
              <Link to={`/supervisors/${level}/report`} className="btn">
                Supervisors report
              </Link>
              <Link to={`/supervisors/${level}/import`} className="btn">
                Import list
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function SupervisorsHubPage() {
  const { isRegionScopeUser } = useAuth();

  return (
    <div className="supervisors-page">
      <PageHeader
        title="Exam Supervisors"
        subtitle={
          isRegionScopeUser
            ? 'Register and manage supervisors for your region with professional photos and records.'
            : 'Central hub for primary and secondary supervisor records, assignments, and ID cards.'
        }
      />

      {isRegionScopeUser ? (
        <div className="supervisor-info-banner">
          Region staff can add supervisors for their assigned region only. A photo is required on
          every new record, or use bulk import with a photos ZIP.
        </div>
      ) : null}

      <div className="supervisor-hub-grid">
        <HubCard
          title="Primary supervisors"
          description={
            isRegionScopeUser
              ? 'Register primary exam supervisors from your region with identification photos.'
              : 'Manage primary exam supervisors, center assignments, and printable ID credentials.'
          }
          level="primary"
          regionUser={isRegionScopeUser}
        />
        <HubCard
          title="Secondary supervisors"
          description={
            isRegionScopeUser
              ? 'Register secondary exam supervisors from your region with identification photos.'
              : 'Manage secondary exam supervisors, center assignments, and printable ID credentials.'
          }
          level="secondary"
          regionUser={isRegionScopeUser}
        />
      </div>
    </div>
  );
}

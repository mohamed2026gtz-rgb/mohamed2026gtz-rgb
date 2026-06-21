interface Props {
  title: string;
  levelLabel: string;
  regionLabel: string;
  academicYear: string;
  subtitle?: string;
}

export function SupervisorReportHeader({
  title,
  levelLabel,
  regionLabel,
  academicYear,
  subtitle,
}: Props) {
  const generatedOn = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="supervisor-report-header" aria-label={title}>
      <div className="supervisor-report-header__banner">
        <div className="supervisor-report-header__brand">
          <span className="supervisor-report-header__monogram" aria-hidden="true">
            SL
          </span>
          <div className="supervisor-report-header__brand-text">
            <p className="supervisor-report-header__org">
              Somaliland National Examination & Certification Board
            </p>
            <p className="supervisor-report-header__org-sub">Republic of Somaliland</p>
          </div>
        </div>
        <div className="supervisor-report-header__doc-meta">
          <span className="supervisor-report-header__doc-label">Official report</span>
          <span className="supervisor-report-header__doc-date">{generatedOn}</span>
        </div>
      </div>

      <div className="supervisor-report-header__title-section">
        <p className="supervisor-report-header__kicker">{levelLabel} examination programme</p>
        <h1 className="supervisor-report-header__title">{title}</h1>
        <div className="supervisor-report-header__meta">
          <div className="supervisor-report-header__meta-item">
            <span className="supervisor-report-header__meta-label">Level</span>
            <span className="supervisor-report-header__meta-value">{levelLabel}</span>
          </div>
          <div className="supervisor-report-header__meta-item">
            <span className="supervisor-report-header__meta-label">Region</span>
            <span className="supervisor-report-header__meta-value">{regionLabel}</span>
          </div>
          <div className="supervisor-report-header__meta-item">
            <span className="supervisor-report-header__meta-label">Academic year</span>
            <span className="supervisor-report-header__meta-value">{academicYear}</span>
          </div>
        </div>
        {subtitle ? <p className="supervisor-report-header__subtitle">{subtitle}</p> : null}
      </div>

      <div className="supervisor-report-header__rule" aria-hidden="true">
        <span className="supervisor-report-header__rule-gold" />
        <span className="supervisor-report-header__rule-green" />
      </div>
    </header>
  );
}
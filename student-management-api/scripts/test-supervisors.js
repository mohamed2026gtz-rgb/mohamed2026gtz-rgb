/**
 * End-to-end test: create supervisors, assign to exam centers, list assignments.
 * Requires API running on PORT (default 5103).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const BASE = `http://127.0.0.1:${process.env.PORT || 5103}`;

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(typeof data === 'object' ? data.message || JSON.stringify(data) : data);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function main() {
  console.log('=== Supervisor API test ===\n');

  const login = await api('POST', '/api/auth/login', {
    username: process.env.TEST_EMAIL || 'admin@sneo.gov',
    password: process.env.TEST_PASSWORD || 'Admin@123',
  });
  const token = login.token;
  console.log('Login OK as', login.user?.email || login.user?.userName);

  const primaryCenters = await api('GET', '/api/exam-centers/primary', null, token);
  const secondaryCenters = await api(
    'GET',
    '/api/exam-centers/secondary?search=ARDALE',
    null,
    token
  );
  console.log(`Primary centers: ${primaryCenters.length}`);
  console.log(`Secondary centers (ARDALE search): ${secondaryCenters.length}`);

  if (!primaryCenters.length || !secondaryCenters.length) {
    throw new Error('Need at least one primary and one secondary exam center');
  }

  const primaryCenter = primaryCenters[0];
  const secondaryCenter = secondaryCenters[0];

  const primarySup = await api(
    'POST',
    '/api/supervisors/primary',
    {
      name: 'Test Primary Supervisor',
      sex: 'Male',
      mobile: '0612345678',
      yearOfBirth: '1985-06-15',
      residency: 'Hargeisa',
      email: 'primary.supervisor.test@example.com',
      currentInstitution: 'SNEO Primary Office',
      title: 'Senior Supervisor',
      experienceForSupervision: '8 years primary exam supervision',
    },
    token
  );
  console.log('Created primary supervisor id:', primarySup.id);

  const secondarySup = await api(
    'POST',
    '/api/supervisors/secondary',
    {
      name: 'Test Secondary Supervisor',
      sex: 'Female',
      mobile: '0619876543',
      yearOfBirth: '1988-03-20',
      residency: 'Borama',
      email: 'secondary.supervisor.test@example.com',
      currentInstitution: 'SNEO Secondary Office',
      title: 'Exam Center Supervisor',
      experienceForSupervision: '5 years secondary exam supervision',
    },
    token
  );
  console.log('Created secondary supervisor id:', secondarySup.id);

  const primaryAssign = await api(
    'POST',
    '/api/supervisors/primary/assignments',
    {
      supervisorId: primarySup.id,
      centerId: primaryCenter.id,
      academicYear: primaryCenter.academicYear || '2025/2026',
      notes: 'Test primary assignment',
    },
    token
  );
  console.log('Primary assignment:', primaryAssign.centerId, '->', primaryCenter.centerName);

  const secondaryAssign = await api(
    'POST',
    '/api/supervisors/secondary/assignments',
    {
      supervisorId: secondarySup.id,
      centerId: secondaryCenter.id,
      academicYear: secondaryCenter.academicYear || '2025/2026',
      notes: 'Test secondary assignment',
    },
    token
  );
  console.log('Secondary assignment:', secondaryAssign.centerId, '->', secondaryCenter.centerName);

  const primaryList = await api(
    'GET',
    `/api/supervisors/primary/assignments/list?supervisorId=${primarySup.id}`,
    null,
    token
  );
  const secondaryList = await api(
    'GET',
    `/api/supervisors/secondary/assignments/list?supervisorId=${secondarySup.id}`,
    null,
    token
  );

  console.log('\n--- Primary assignments ---');
  primaryList.forEach((a) =>
    console.log(`  ${a.supervisorName} -> ${a.centerName} (${a.region}) [${a.academicYear}]`)
  );
  console.log('\n--- Secondary assignments ---');
  secondaryList.forEach((a) =>
    console.log(`  ${a.supervisorName} -> ${a.centerName} (${a.region}) [${a.academicYear}]`)
  );

  console.log('\n=== All tests passed ===');
}

main().catch((err) => {
  console.error('\nTest failed:', err.message);
  process.exit(1);
});

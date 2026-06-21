const fs = require('fs');
const path = 'c:/Users/Mohamed/Desktop/MOBILEAPPFORFLUTTER/student-management-api/src/routes/supervisors.js';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `  importSupervisors,
  importAssignments,
} = require('../services/supervisorImportService');`,
  `  importSupervisors,
  importSupervisorsWithPhotos,
  importAssignments,
} = require('../services/supervisorImportService');`
);

c = c.replace(
  `const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});`,
  `const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});`
);

const handler = `
async function importSupervisorsWithPhotosHandler(level, req, res, next) {
  try {
    const csvFile = req.files?.file?.[0];
    const photosZip = req.files?.photos?.[0];
    const rows = parseImportPayload(req.body, csvFile?.buffer);
    if (!rows?.length) {
      return res.status(400).json({ message: 'Upload a CSV file with supervisor rows' });
    }
    if (!photosZip?.buffer?.length) {
      return res.status(400).json({ message: 'Upload a ZIP file containing supervisor photos' });
    }

    const createLogins =
      req.body?.createLogins === true ||
      req.body?.createLogins === 'true' ||
      String(req.query.createLogins || '').toLowerCase() === 'true';

    const summary = await importSupervisorsWithPhotos(level, rows, photosZip.buffer, { createLogins });
    res.status(summary.errors.length && !summary.created ? 400 : 200).json({
      ...summary,
      totalRows: rows.length,
      message: \`Imported \${summary.created} supervisor(s), attached \${summary.photosAttached || 0} photo(s), skipped \${summary.skipped}, \${summary.errors.length} error(s)\`,
    });
  } catch (err) {
    next(err);
  }
}
`;

c = c.replace('async function importAssignmentsHandler', handler + '\nasync function importAssignmentsHandler');

c = c.replace(
  `router.post('/primary/import', upload.single('file'), (req, res, next) =>
  importSupervisorsHandler('primary', req, res, next)
);`,
  `router.post('/primary/import', upload.single('file'), (req, res, next) =>
  importSupervisorsHandler('primary', req, res, next)
);
router.post(
  '/primary/import-with-photos',
  importUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'photos', maxCount: 1 },
  ]),
  (req, res, next) => importSupervisorsWithPhotosHandler('primary', req, res, next)
);`
);

c = c.replace(
  `router.post('/secondary/import', upload.single('file'), (req, res, next) =>
  importSupervisorsHandler('secondary', req, res, next)
);`,
  `router.post('/secondary/import', upload.single('file'), (req, res, next) =>
  importSupervisorsHandler('secondary', req, res, next)
);
router.post(
  '/secondary/import-with-photos',
  importUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'photos', maxCount: 1 },
  ]),
  (req, res, next) => importSupervisorsWithPhotosHandler('secondary', req, res, next)
);`
);

fs.writeFileSync(path, c, 'utf8');
console.log('routes patched');
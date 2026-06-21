function toSupervisorDto(row) {
  const level = row._level || null;
  const id = Number(row.id);
  const hasPhoto = Boolean(row.image_url);
  return {
    id,
    name: row.name,
    sex: row.sex,
    mobile: row.mobile,
    yearOfBirth: row.year_of_birth
      ? new Date(row.year_of_birth).toISOString().slice(0, 10)
      : null,
    residency: row.residency,
    region: row.region || null,
    email: row.email,
    currentInstitution: row.current_institution,
    title: row.title,
    experienceForSupervision: row.experience_for_supervision,
    userId: row.user_id ? Number(row.user_id) : null,
    isActive: Boolean(row.is_active),
    hasPhoto,
    photoUrl: hasPhoto && level ? `/api/supervisors/${level}/${id}/photo` : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateSupervisorBody(body) {
  const { isValidEmail, isValidMobile, normalizeMobile, isValidSex } = require('./validation');
  const errors = [];

  const email = body.email?.trim() || '';
  const mobile = body.mobile?.trim() || '';
  const sex = body.sex?.trim() || '';

  if (email && !isValidEmail(email)) {
    errors.push('Enter a valid email address (e.g. name@example.com)');
  }
  if (mobile && !isValidMobile(mobile)) {
    errors.push('Enter a valid telephone number (e.g. +252612345678 or 0612345678)');
  }
  if (sex && !isValidSex(sex)) {
    errors.push('Sex must be Male or Female');
  }

  return { errors, email: email || null, mobile: mobile ? normalizeMobile(mobile) : null, sex: sex || null };
}

function supervisorInsertFields(body) {
  const validated = validateSupervisorBody(body);
  if (validated.errors.length) {
    const err = new Error(validated.errors.join('; '));
    err.statusCode = 400;
    throw err;
  }

  return {
    name: body.name?.trim(),
    sex: validated.sex,
    mobile: validated.mobile,
    year_of_birth: body.yearOfBirth || null,
    residency: body.residency?.trim() || null,
    region: body.region?.trim() || null,
    email: validated.email,
    current_institution: body.currentInstitution?.trim() || null,
    title: body.title?.trim() || null,
    experience_for_supervision: body.experienceForSupervision?.trim() || null,
  };
}

module.exports = { toSupervisorDto, supervisorInsertFields, validateSupervisorBody };

const express = require('express');
const { authenticate, requireFullAdmin } = require('../middleware/auth');
const {
  ASSIGNABLE_SCOPE_TYPES,
  listStaffUsers,
  getStaffUser,
  createStaffUser,
  updateStaffUser,
} = require('../services/userService');

const router = express.Router();

router.get('/scope-types', authenticate, requireFullAdmin, (req, res) => {
  res.json(ASSIGNABLE_SCOPE_TYPES);
});

router.get('/', authenticate, requireFullAdmin, async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Math.min(Number(req.query.pageSize) || 50, 100);
    const search = req.query.search;
    const result = await listStaffUsers({ page, pageSize, search });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, requireFullAdmin, async (req, res, next) => {
  try {
    const user = await getStaffUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireFullAdmin, async (req, res, next) => {
  try {
    const result = await createStaffUser(req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.status(result.status).json(result.user);
  } catch (err) {
    if (err.message?.includes('scopeType') || err.message?.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
});

router.put('/:id', authenticate, requireFullAdmin, async (req, res, next) => {
  try {
    const result = await updateStaffUser(Number(req.params.id), req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.user);
  } catch (err) {
    if (err.message?.includes('scopeType') || err.message?.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
});

module.exports = router;
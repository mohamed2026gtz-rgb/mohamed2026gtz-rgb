const express = require('express');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM regions WHERE 1=1';
    const params = [];

    if (search && String(search).trim()) {
      sql += ' AND region_name LIKE ?';
      params.push(`%${String(search).trim()}%`);
    }

    sql += ' ORDER BY region_name';
    const [rows] = await pool.query(sql, params);

    res.json(
      rows.map((r) => ({
        auto: Number(r.region_id),
        name: r.region_name,
        reo: null,
        tell: r.region_code,
        email: null,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get('/:id/districts', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [regions] = await pool.query(
      'SELECT region_id FROM regions WHERE region_id = ? LIMIT 1',
      [id]
    );
    if (!regions.length) return res.status(404).json({ message: 'Region not found' });

    const { search } = req.query;
    let sql = 'SELECT * FROM districts WHERE region_id = ?';
    const params = [id];

    if (search && String(search).trim()) {
      sql += ' AND district_name LIKE ?';
      params.push(`%${String(search).trim()}%`);
    }

    sql += ' ORDER BY district_name';
    const [rows] = await pool.query(sql, params);

    res.json(
      rows.map((d) => ({
        auto: Number(d.district_id),
        name: d.district_name,
        region: String(d.region_id),
        deo: null,
        tell: null,
        email: null,
      }))
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;

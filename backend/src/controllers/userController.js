const { getUsers } = require('../services/userService');
const { requireRole } = require('../middleware/roleMiddleware');
const auth = require('../middleware/authMiddleware');

const router = require('express').Router();

router.get('/', auth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const data = await getUsers({ page, pageSize });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

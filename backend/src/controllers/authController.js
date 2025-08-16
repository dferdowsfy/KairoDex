const { register, login } = require('../services/authService');
const { validate, registerSchema, loginSchema } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');

const router = require('express').Router();

router.post('/register', authLimiter(), validate(registerSchema), async (req, res, next) => {
  try {
    const user = await register(req.validated);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter(), validate(loginSchema), async (req, res, next) => {
  try {
    const data = await login(req.validated);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

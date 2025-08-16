const auth = require('../middleware/authMiddleware');
const { validate, projectCreateSchema, projectUpdateSchema } = require('../utils/validators');
const { createForUser, listForUser, getById, updateById, removeById } = require('../services/projectService');

const router = require('express').Router();

router.post('/', auth, validate(projectCreateSchema), async (req, res, next) => {
  try {
    const project = await createForUser(req.user, req.validated);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const data = await listForUser(req.user, { page, pageSize });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const project = await getById(req.user, req.params.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', auth, validate(projectUpdateSchema), async (req, res, next) => {
  try {
    const project = await updateById(req.user, req.params.id, req.validated);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const result = await removeById(req.user, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

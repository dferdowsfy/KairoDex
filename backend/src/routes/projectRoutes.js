const router = require('express').Router();
const projectController = require('../controllers/projectController');
router.use('/', projectController);
module.exports = router;

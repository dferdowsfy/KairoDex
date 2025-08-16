const router = require('express').Router();
router.use('/auth', require('./authController'));
router.use('/users', require('./userController'));
router.use('/projects', require('./projectController'));
module.exports = router;

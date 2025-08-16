const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', version: require('../../package.json').version, timestamp: new Date().toISOString() });
});

module.exports = router;

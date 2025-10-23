const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// List audit logs (user can only see their own actions)
router.get('/', (req, res) => {
  const allLogs = db.findAll('audit_logs.json');
  const userLogs = allLogs.filter(log =>
    log.ActingUser === req.session.user.UniqueId ||
    log.TargetThing === req.session.user.UniqueId
  );

  // Sort by timestamp descending
  userLogs.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

  res.render('auditLogs/index', { auditLogs: userLogs });
});

module.exports = router;

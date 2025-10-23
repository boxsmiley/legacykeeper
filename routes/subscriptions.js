const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// View user's subscription
router.get('/', (req, res) => {
  const subscriptions = db.findByField('subscriptions.json', 'CreatedBy', req.session.user.UniqueId);
  const plans = db.findAll('subscription_plans.json');

  res.render('subscriptions/index', { subscriptions, plans });
});

// View subscription details
router.get('/:id', (req, res) => {
  const subscription = db.findById('subscriptions.json', req.params.id);
  if (!subscription) {
    req.flash('error_msg', 'Subscription not found');
    return res.redirect('/subscriptions');
  }

  const plan = db.findById('subscription_plans.json', subscription.Plan);
  res.render('subscriptions/details', { subscription, plan });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

router.use(ensureAuthenticated);
router.use(ensureAdmin);

// List all subscription plans
router.get('/', async (req, res) => {
  const plans = await db.findAll('subscription_plans.json');
  res.render('subscriptionPlans/index', { plans });
});

// New plan form
router.get('/new', async (req, res) => {
  res.render('subscriptionPlans/form', { plan: null, action: 'create' });
});

// Create plan
router.post('/', async (req, res) => {
  const { SubscriptionLevel, PriceMonthly, PriceAnnual, StorageLimitGB, WorkUnitLimit, FeatureList } = req.body;

  db.create('subscription_plans.json', {
    SubscriptionLevel,
    PriceMonthly: parseFloat(PriceMonthly) || 0,
    PriceAnnual: parseFloat(PriceAnnual) || 0,
    StorageLimitGB: parseInt(StorageLimitGB) || 0,
    WorkUnitLimit: parseInt(WorkUnitLimit) || 0,
    FeatureList: FeatureList ? FeatureList.split(',').map(f => f.trim()) : [],
    CreatedBy: req.session.user.UniqueId
  });

  req.flash('success_msg', 'Subscription plan created successfully');
  res.redirect('/subscription-plans');
});

// Edit plan form
router.get('/:id/edit', async (req, res) => {
  const plan = await db.findById('subscription_plans.json', req.params.id);
  if (!plan) {
    req.flash('error_msg', 'Plan not found');
    return res.redirect('/subscription-plans');
  }
  res.render('subscriptionPlans/form', { plan, action: 'edit' });
});

// Update plan
router.put('/:id', async (req, res) => {
  const { SubscriptionLevel, PriceMonthly, PriceAnnual, StorageLimitGB, WorkUnitLimit, FeatureList } = req.body;

  db.update('subscription_plans.json', req.params.id, {
    SubscriptionLevel,
    PriceMonthly: parseFloat(PriceMonthly) || 0,
    PriceAnnual: parseFloat(PriceAnnual) || 0,
    StorageLimitGB: parseInt(StorageLimitGB) || 0,
    WorkUnitLimit: parseInt(WorkUnitLimit) || 0,
    FeatureList: FeatureList ? FeatureList.split(',').map(f => f.trim()) : []
  });

  req.flash('success_msg', 'Subscription plan updated successfully');
  res.redirect('/subscription-plans');
});

// Delete plan
router.delete('/:id', async (req, res) => {
  db.delete('subscription_plans.json', req.params.id);
  req.flash('success_msg', 'Subscription plan deleted successfully');
  res.redirect('/subscription-plans');
});

module.exports = router;

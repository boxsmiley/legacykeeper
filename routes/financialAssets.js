const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// List financial assets
router.get('/', (req, res) => {
  const financialAssets = db.findByField('financial_assets.json', 'OwnerUser', req.session.user.UniqueId);
  res.render('financialAssets/index', { financialAssets });
});

// New financial asset form
router.get('/new', (req, res) => {
  res.render('financialAssets/form', { financialAsset: null, action: 'create' });
});

// Create financial asset
router.post('/', (req, res) => {
  const { AssetName, AssetType, LoginURL, UsernameIdentifier, PasswordKey, Notes } = req.body;

  db.create('financial_assets.json', {
    AssetName,
    AssetType,
    LoginURL,
    UsernameIdentifier,
    PasswordKey,
    Notes,
    DateAdded: new Date().toISOString(),
    OwnerUser: req.session.user.UniqueId,
    CreatedBy: req.session.user.UniqueId
  });

  req.flash('success_msg', 'Financial asset created successfully');
  res.redirect('/financial-assets');
});

// Edit financial asset form
router.get('/:id/edit', (req, res) => {
  const financialAsset = db.findById('financial_assets.json', req.params.id);
  if (!financialAsset || financialAsset.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Financial asset not found');
    return res.redirect('/financial-assets');
  }
  res.render('financialAssets/form', { financialAsset, action: 'edit' });
});

// Update financial asset
router.put('/:id', (req, res) => {
  const { AssetName, AssetType, LoginURL, UsernameIdentifier, PasswordKey, Notes } = req.body;

  const financialAsset = db.findById('financial_assets.json', req.params.id);
  if (!financialAsset || financialAsset.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Financial asset not found');
    return res.redirect('/financial-assets');
  }

  db.update('financial_assets.json', req.params.id, {
    AssetName,
    AssetType,
    LoginURL,
    UsernameIdentifier,
    PasswordKey,
    Notes
  });

  req.flash('success_msg', 'Financial asset updated successfully');
  res.redirect('/financial-assets');
});

// Delete financial asset
router.delete('/:id', (req, res) => {
  const financialAsset = db.findById('financial_assets.json', req.params.id);
  if (!financialAsset || financialAsset.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Financial asset not found');
    return res.redirect('/financial-assets');
  }

  db.delete('financial_assets.json', req.params.id);
  req.flash('success_msg', 'Financial asset deleted successfully');
  res.redirect('/financial-assets');
});

module.exports = router;

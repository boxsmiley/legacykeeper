const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// List digital assets
router.get('/', async (req, res) => {
  const digitalAssets = await db.findByField('digital_assets.json', 'OwnerUser', req.session.user.UniqueId);
  res.render('digitalAssets/index', { digitalAssets });
});

// New digital asset form
router.get('/new', async (req, res) => {
  res.render('digitalAssets/form', { digitalAsset: null, action: 'create' });
});

// Create digital asset
router.post('/', async (req, res) => {
  const { AssetName, AssetType, LoginURL, UsernameIdentifier, PasswordKey, Notes } = req.body;

  db.create('digital_assets.json', {
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

  req.flash('success_msg', 'Digital asset created successfully');
  res.redirect('/digital-assets');
});

// Edit digital asset form
router.get('/:id/edit', async (req, res) => {
  const digitalAsset = await db.findById('digital_assets.json', req.params.id);
  if (!digitalAsset || digitalAsset.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Digital asset not found');
    return res.redirect('/digital-assets');
  }
  res.render('digitalAssets/form', { digitalAsset, action: 'edit' });
});

// Update digital asset
router.put('/:id', async (req, res) => {
  const { AssetName, AssetType, LoginURL, UsernameIdentifier, PasswordKey, Notes } = req.body;

  const digitalAsset = await db.findById('digital_assets.json', req.params.id);
  if (!digitalAsset || digitalAsset.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Digital asset not found');
    return res.redirect('/digital-assets');
  }

  db.update('digital_assets.json', req.params.id, {
    AssetName,
    AssetType,
    LoginURL,
    UsernameIdentifier,
    PasswordKey,
    Notes
  });

  req.flash('success_msg', 'Digital asset updated successfully');
  res.redirect('/digital-assets');
});

// Delete digital asset
router.delete('/:id', async (req, res) => {
  const digitalAsset = await db.findById('digital_assets.json', req.params.id);
  if (!digitalAsset || digitalAsset.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Digital asset not found');
    return res.redirect('/digital-assets');
  }

  db.delete('digital_assets.json', req.params.id);
  req.flash('success_msg', 'Digital asset deleted successfully');
  res.redirect('/digital-assets');
});

module.exports = router;

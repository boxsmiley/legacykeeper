const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// List legacy entries
router.get('/', async (req, res) => {
  const legacyEntries = await db.findByField('legacy_entries.json', 'OwnerUser', req.session.user.UniqueId);
  res.render('legacyEntries/index', { legacyEntries });
});

// New legacy entry form
router.get('/new', async (req, res) => {
  res.render('legacyEntries/form', { legacyEntry: null, action: 'create' });
});

// Create legacy entry
router.post('/', async (req, res) => {
  const { EntryTitle, LegacyEntryType, ContentText, MediaFile } = req.body;

  db.create('legacy_entries.json', {
    EntryTitle,
    LegacyEntryType,
    ContentText,
    MediaFile: MediaFile || '',
    DateCreated: new Date().toISOString(),
    OwnerUser: req.session.user.UniqueId,
    CreatedBy: req.session.user.UniqueId
  });

  req.flash('success_msg', 'Legacy entry created successfully');
  res.redirect('/legacy-entries');
});

// Edit legacy entry form
router.get('/:id/edit', async (req, res) => {
  const legacyEntry = await db.findById('legacy_entries.json', req.params.id);
  if (!legacyEntry || legacyEntry.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Legacy entry not found');
    return res.redirect('/legacy-entries');
  }
  res.render('legacyEntries/form', { legacyEntry, action: 'edit' });
});

// Update legacy entry
router.put('/:id', async (req, res) => {
  const { EntryTitle, LegacyEntryType, ContentText, MediaFile } = req.body;

  const legacyEntry = await db.findById('legacy_entries.json', req.params.id);
  if (!legacyEntry || legacyEntry.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Legacy entry not found');
    return res.redirect('/legacy-entries');
  }

  db.update('legacy_entries.json', req.params.id, {
    EntryTitle,
    LegacyEntryType,
    ContentText,
    MediaFile
  });

  req.flash('success_msg', 'Legacy entry updated successfully');
  res.redirect('/legacy-entries');
});

// Delete legacy entry
router.delete('/:id', async (req, res) => {
  const legacyEntry = await db.findById('legacy_entries.json', req.params.id);
  if (!legacyEntry || legacyEntry.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Legacy entry not found');
    return res.redirect('/legacy-entries');
  }

  db.delete('legacy_entries.json', req.params.id);
  req.flash('success_msg', 'Legacy entry deleted successfully');
  res.redirect('/legacy-entries');
});

module.exports = router;

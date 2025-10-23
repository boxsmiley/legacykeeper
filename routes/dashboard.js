const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all dashboard routes
router.use(ensureAuthenticated);

// Dashboard home
router.get('/', (req, res) => {
  const userId = req.session.user.UniqueId;

  // Get full user details
  const userDetails = db.findById('users.json', userId);

  // Get user's items
  const documents = db.findByField('documents.json', 'OwnerUser', userId);
  const contacts = db.findByField('contacts.json', 'OwnerUser', userId);
  const contactGroups = db.findByField('contact_groups.json', 'OwnerUser', userId);
  const digitalAssets = db.findByField('digital_assets.json', 'OwnerUser', userId);
  const financialAssets = db.findByField('financial_assets.json', 'OwnerUser', userId);
  const legacyEntries = db.findByField('legacy_entries.json', 'OwnerUser', userId);

  res.render('dashboard/index', {
    user: req.session.user,
    userDetails: userDetails,
    stats: {
      documents: documents.length,
      contacts: contacts.length,
      contactGroups: contactGroups.length,
      digitalAssets: digitalAssets.length,
      financialAssets: financialAssets.length,
      legacyEntries: legacyEntries.length
    }
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all dashboard routes
router.use(ensureAuthenticated);

// Dashboard home
router.get('/', async (req, res) => {
  const userId = req.session.user.UniqueId;

  // Get full user details
  const userDetails = await db.findById('users.json', userId);

  // Get user's items
  const documents = await db.findByField('documents.json', 'OwnerUser', userId);
  const contacts = await db.findByField('contacts.json', 'OwnerUser', userId);
  const contactGroups = await db.findByField('contact_groups.json', 'OwnerUser', userId);
  const digitalAssets = await db.findByField('digital_assets.json', 'OwnerUser', userId);
  const financialAssets = await db.findByField('financial_assets.json', 'OwnerUser', userId);
  const legacyEntries = await db.findByField('legacy_entries.json', 'OwnerUser', userId);

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

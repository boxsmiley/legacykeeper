const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// List contact groups
router.get('/', async (req, res) => {
  const contactGroups = await db.findByField('contact_groups.json', 'OwnerUser', req.session.user.UniqueId);
  res.render('contactGroups/index', { contactGroups });
});

// New contact group form
router.get('/new', async (req, res) => {
  const contacts = await db.findByField('contacts.json', 'OwnerUser', req.session.user.UniqueId);
  res.render('contactGroups/form', { contactGroup: null, action: 'create', contacts });
});

// Create contact group
router.post('/', async (req, res) => {
  const { GroupName, Description, Members } = req.body;

  db.create('contact_groups.json', {
    GroupName,
    Description,
    Members: Array.isArray(Members) ? Members : (Members ? [Members] : []),
    OwnerUser: req.session.user.UniqueId,
    CreatedBy: req.session.user.UniqueId
  });

  req.flash('success_msg', 'Contact group created successfully');
  res.redirect('/contact-groups');
});

// Edit contact group form
router.get('/:id/edit', async (req, res) => {
  const contactGroup = await db.findById('contact_groups.json', req.params.id);
  if (!contactGroup || contactGroup.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Contact group not found');
    return res.redirect('/contact-groups');
  }
  const contacts = await db.findByField('contacts.json', 'OwnerUser', req.session.user.UniqueId);
  res.render('contactGroups/form', { contactGroup, action: 'edit', contacts });
});

// Update contact group
router.put('/:id', async (req, res) => {
  const { GroupName, Description, Members } = req.body;

  const contactGroup = await db.findById('contact_groups.json', req.params.id);
  if (!contactGroup || contactGroup.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Contact group not found');
    return res.redirect('/contact-groups');
  }

  db.update('contact_groups.json', req.params.id, {
    GroupName,
    Description,
    Members: Array.isArray(Members) ? Members : (Members ? [Members] : [])
  });

  req.flash('success_msg', 'Contact group updated successfully');
  res.redirect('/contact-groups');
});

// Delete contact group
router.delete('/:id', async (req, res) => {
  const contactGroup = await db.findById('contact_groups.json', req.params.id);
  if (!contactGroup || contactGroup.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Contact group not found');
    return res.redirect('/contact-groups');
  }

  db.delete('contact_groups.json', req.params.id);
  req.flash('success_msg', 'Contact group deleted successfully');
  res.redirect('/contact-groups');
});

module.exports = router;

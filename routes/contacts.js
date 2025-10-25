const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// List contacts
router.get('/', async (req, res) => {
  const contacts = await db.findByField('contacts.json', 'OwnerUser', req.session.user.UniqueId);
  res.render('contacts/index', { contacts });
});

// New contact form
router.get('/new', async (req, res) => {
  res.render('contacts/form', { contact: null, action: 'create' });
});

// Create contact
router.post('/', async (req, res) => {
  const { FirstName, LastName, Email, PhoneNumber, Address, Relationship, Notes } = req.body;

  db.create('contacts.json', {
    FirstName,
    LastName,
    Email,
    PhoneNumber,
    Address,
    Relationship,
    Notes,
    DateAdded: new Date().toISOString(),
    OwnerUser: req.session.user.UniqueId,
    AssociatedUserAccount: '',
    CreatedBy: req.session.user.UniqueId
  });

  req.flash('success_msg', 'Contact created successfully');
  res.redirect('/contacts');
});

// Edit contact form
router.get('/:id/edit', async (req, res) => {
  const contact = await db.findById('contacts.json', req.params.id);
  if (!contact || contact.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Contact not found');
    return res.redirect('/contacts');
  }
  res.render('contacts/form', { contact, action: 'edit' });
});

// Update contact
router.put('/:id', async (req, res) => {
  const { FirstName, LastName, Email, PhoneNumber, Address, Relationship, Notes } = req.body;

  const contact = await db.findById('contacts.json', req.params.id);
  if (!contact || contact.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Contact not found');
    return res.redirect('/contacts');
  }

  db.update('contacts.json', req.params.id, {
    FirstName,
    LastName,
    Email,
    PhoneNumber,
    Address,
    Relationship,
    Notes
  });

  req.flash('success_msg', 'Contact updated successfully');
  res.redirect('/contacts');
});

// Delete contact
router.delete('/:id', async (req, res) => {
  const contact = await db.findById('contacts.json', req.params.id);
  if (!contact || contact.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Contact not found');
    return res.redirect('/contacts');
  }

  db.delete('contacts.json', req.params.id);
  req.flash('success_msg', 'Contact deleted successfully');
  res.redirect('/contacts');
});

module.exports = router;

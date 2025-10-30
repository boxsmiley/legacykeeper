const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');
const { sendExecutorNotificationEmail } = require('./executorNotifications');

router.use(ensureAuthenticated);

// List contacts (now from connections.json)
router.get('/', async (req, res) => {
  // Get all connections where ConnectionType is 'contact'
  const allConnections = await db.findAll('connections.json');
  const contactConnections = allConnections.filter(c =>
    c.OwnerUser === req.session.user.UniqueId &&
    c.ConnectionType === 'contact'
  );

  // Transform connections to contact format for backwards compatibility with views
  const contacts = contactConnections.map(conn => ({
    UniqueId: conn.ConnectedEntityId,
    FirstName: conn.ContactDetails?.FirstName || '',
    LastName: conn.ContactDetails?.LastName || '',
    Email: conn.ContactDetails?.Email || '',
    PhoneNumber: conn.ContactDetails?.PhoneNumber || '',
    Address: conn.ContactDetails?.Address || '',
    Relationship: conn.RelationshipType,
    Notes: conn.Notes,
    DateAdded: conn.ConnectedAt,
    OwnerUser: conn.OwnerUser,
    AssociatedUserAccount: conn.ContactDetails?.AssociatedUserAccount || '',
    CreatedBy: conn.CreatedBy,
    _connectionId: conn.UniqueId // Store connection ID for reference
  }));

  res.render('contacts/index', { contacts });
});

// New contact form
router.get('/new', async (req, res) => {
  res.render('contacts/form', { contact: null, action: 'create' });
});

// Create contact (now stored as connection)
router.post('/', async (req, res) => {
  const { FirstName, LastName, Email, PhoneNumber, Address, Relationship, Notes } = req.body;

  try {
    // Generate unique ID for the contact entity
    const { v4: uuidv4 } = require('uuid');
    const contactEntityId = uuidv4();

    // Create connection with embedded contact details
    const newConnection = await db.create('connections.json', {
      OwnerUser: req.session.user.UniqueId,
      ConnectionType: 'contact',
      ConnectedEntityId: contactEntityId,
      RelationshipType: Relationship || '',
      Notes: Notes || '',
      CanViewDocuments: false,
      CanViewAssets: false,
      NotifyOnUpdates: true,
      ConnectionStatus: 'active',
      ConnectedAt: new Date().toISOString(),
      CreatedBy: req.session.user.UniqueId,
      // Embedded contact details
      ContactDetails: {
        FirstName,
        LastName,
        Email,
        PhoneNumber,
        Address,
        AssociatedUserAccount: ''
      }
    });

    // If Relationship is "Executor", send email
    if (Relationship && Relationship.toLowerCase() === 'executor' && Email) {
      const userName = `${req.session.user.FirstName} ${req.session.user.LastName}`;
      await sendExecutorNotificationEmail(
        req.session.user.UniqueId,
        userName,
        Email,
        `${FirstName} ${LastName}`,
        newConnection.UniqueId
      );
    }

    req.flash('success_msg', 'Contact created successfully');
    res.redirect('/contacts');
  } catch (error) {
    console.error('Error creating contact:', error);
    req.flash('error_msg', 'Error creating contact');
    res.redirect('/contacts/new');
  }
});

// Edit contact form
router.get('/:id/edit', async (req, res) => {
  // Find connection by ConnectedEntityId (contact ID)
  const allConnections = await db.findAll('connections.json');
  const connection = allConnections.find(c =>
    c.ConnectedEntityId === req.params.id &&
    c.OwnerUser === req.session.user.UniqueId &&
    c.ConnectionType === 'contact'
  );

  if (!connection) {
    req.flash('error_msg', 'Contact not found');
    return res.redirect('/contacts');
  }

  // Transform connection to contact format for view
  const contact = {
    UniqueId: connection.ConnectedEntityId,
    FirstName: connection.ContactDetails?.FirstName || '',
    LastName: connection.ContactDetails?.LastName || '',
    Email: connection.ContactDetails?.Email || '',
    PhoneNumber: connection.ContactDetails?.PhoneNumber || '',
    Address: connection.ContactDetails?.Address || '',
    Relationship: connection.RelationshipType,
    Notes: connection.Notes,
    DateAdded: connection.ConnectedAt,
    OwnerUser: connection.OwnerUser,
    AssociatedUserAccount: connection.ContactDetails?.AssociatedUserAccount || '',
    CreatedBy: connection.CreatedBy,
    _connectionId: connection.UniqueId
  };

  res.render('contacts/form', { contact, action: 'edit' });
});

// Update contact (now updates connection)
router.put('/:id', async (req, res) => {
  const { FirstName, LastName, Email, PhoneNumber, Address, Relationship, Notes } = req.body;

  try {
    // Find connection by ConnectedEntityId (contact ID)
    const allConnections = await db.findAll('connections.json');
    const connection = allConnections.find(c =>
      c.ConnectedEntityId === req.params.id &&
      c.OwnerUser === req.session.user.UniqueId &&
      c.ConnectionType === 'contact'
    );

    if (!connection) {
      req.flash('error_msg', 'Contact not found');
      return res.redirect('/contacts');
    }

    // Check if Relationship changed to "Executor"
    const wasExecutor = connection.RelationshipType && connection.RelationshipType.toLowerCase() === 'executor';
    const isNowExecutor = Relationship && Relationship.toLowerCase() === 'executor';

    // Update connection with new contact details
    await db.update('connections.json', connection.UniqueId, {
      RelationshipType: Relationship || '',
      Notes: Notes || '',
      ContactDetails: {
        FirstName,
        LastName,
        Email,
        PhoneNumber,
        Address,
        AssociatedUserAccount: connection.ContactDetails?.AssociatedUserAccount || ''
      }
    });

    // If newly designated as Executor, send notification email
    if (!wasExecutor && isNowExecutor && Email) {
      const userName = `${req.session.user.FirstName} ${req.session.user.LastName}`;
      await sendExecutorNotificationEmail(
        req.session.user.UniqueId,
        userName,
        Email,
        `${FirstName} ${LastName}`,
        connection.UniqueId
      );
    }

    req.flash('success_msg', 'Contact updated successfully');

    // Redirect back to the referring page, or default to /contacts
    const referer = req.get('referer');
    if (referer && referer.includes('/connections')) {
      res.redirect('/connections');
    } else {
      res.redirect('/contacts');
    }
  } catch (error) {
    console.error('Error updating contact:', error);
    req.flash('error_msg', 'Error updating contact');
    res.redirect(`/contacts/${req.params.id}/edit`);
  }
});

// Delete contact (now deletes connection)
router.delete('/:id', async (req, res) => {
  // Find connection by ConnectedEntityId (contact ID)
  const allConnections = await db.findAll('connections.json');
  const connection = allConnections.find(c =>
    c.ConnectedEntityId === req.params.id &&
    c.OwnerUser === req.session.user.UniqueId &&
    c.ConnectionType === 'contact'
  );

  if (!connection) {
    req.flash('error_msg', 'Contact not found');
    return res.redirect('/contacts');
  }

  await db.delete('connections.json', connection.UniqueId);
  req.flash('success_msg', 'Contact deleted successfully');
  res.redirect('/contacts');
});

// Convert contact to user - show form
router.get('/:id/convert-to-user', async (req, res) => {
  // Find connection by ConnectedEntityId (contact ID)
  const allConnections = await db.findAll('connections.json');
  const connection = allConnections.find(c =>
    c.ConnectedEntityId === req.params.id &&
    c.OwnerUser === req.session.user.UniqueId &&
    c.ConnectionType === 'contact'
  );

  if (!connection) {
    req.flash('error_msg', 'Contact not found');
    return res.redirect('/contacts');
  }

  // Transform connection to contact format for view
  const contact = {
    UniqueId: connection.ConnectedEntityId,
    FirstName: connection.ContactDetails?.FirstName || '',
    LastName: connection.ContactDetails?.LastName || '',
    Email: connection.ContactDetails?.Email || '',
    PhoneNumber: connection.ContactDetails?.PhoneNumber || '',
    Address: connection.ContactDetails?.Address || '',
    Relationship: connection.RelationshipType,
    Notes: connection.Notes,
    AssociatedUserAccount: connection.ContactDetails?.AssociatedUserAccount || ''
  };

  // Check if contact already has an associated user account
  if (contact.AssociatedUserAccount && contact.AssociatedUserAccount.trim() !== '') {
    const existingUser = await db.findById('users.json', contact.AssociatedUserAccount);
    if (existingUser) {
      req.flash('error_msg', 'This contact is already associated with a user account');
      return res.redirect('/contacts');
    }
  }

  // Check if email is already in use
  if (contact.Email && contact.Email.trim() !== '') {
    const users = await db.findAll('users.json');
    const emailExists = users.find(u => u.Email === contact.Email);
    if (emailExists) {
      req.flash('error_msg', 'A user account with this email already exists');
      return res.redirect('/contacts');
    }
  }

  res.render('contacts/convert-to-user', { contact });
});

// Convert contact to user - process conversion
router.post('/:id/convert-to-user', async (req, res) => {
  const { Password, Password2, Role, AccountStatus } = req.body;

  try {
    // Find connection by ConnectedEntityId (contact ID)
    const allConnections = await db.findAll('connections.json');
    const connection = allConnections.find(c =>
      c.ConnectedEntityId === req.params.id &&
      c.OwnerUser === req.session.user.UniqueId &&
      c.ConnectionType === 'contact'
    );

    if (!connection) {
      req.flash('error_msg', 'Contact not found');
      return res.redirect('/contacts');
    }

    // Extract contact details
    const contactEmail = connection.ContactDetails?.Email || '';
    const contactFirstName = connection.ContactDetails?.FirstName || 'User';
    const contactLastName = connection.ContactDetails?.LastName || '';
    const contactPhoneNumber = connection.ContactDetails?.PhoneNumber || '';
    const contactAddress = connection.ContactDetails?.Address || '';

    // Validate required fields
    if (!contactEmail || contactEmail.trim() === '') {
      req.flash('error_msg', 'Contact must have an email address to be converted to a user');
      return res.redirect(`/contacts/${req.params.id}/convert-to-user`);
    }

    if (!Password || Password.trim() === '') {
      req.flash('error_msg', 'Password is required');
      return res.redirect(`/contacts/${req.params.id}/convert-to-user`);
    }

    if (Password !== Password2) {
      req.flash('error_msg', 'Passwords do not match');
      return res.redirect(`/contacts/${req.params.id}/convert-to-user`);
    }

    // Check password strength
    if (Password.length < 6) {
      req.flash('error_msg', 'Password must be at least 6 characters long');
      return res.redirect(`/contacts/${req.params.id}/convert-to-user`);
    }

    // Check if email is already in use
    const users = await db.findAll('users.json');
    const emailExists = users.find(u => u.Email === contactEmail);
    if (emailExists) {
      req.flash('error_msg', 'A user account with this email already exists');
      return res.redirect(`/contacts/${req.params.id}/convert-to-user`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // Create new user account
    const newUser = await db.create('users.json', {
      FirstName: contactFirstName,
      MiddleName: '',
      LastName: contactLastName,
      Email: contactEmail,
      PasswordHash: hashedPassword,
      DateOfBirth: '',
      PhoneNumber: contactPhoneNumber,
      MailingAddress: contactAddress,
      Role: Role || 'user',
      AccountStatus: AccountStatus || 'active',
      MFA_Enabled: false,
      SocialSecurityNumber: '',
      ProfilePicture: '',
      AssignedRoles: [],
      TestRoles: [],
      OwnedContacts: [],
      OwnedContactGroups: [],
      OwnedContractGroups: [],
      OwnedDocuments: [],
      OwnedDigitalAssets: [],
      OwnedFinancialAssets: [],
      SocialNetworks: [],
      CreatedBy: req.session.user.UniqueId,
      ConvertedFromContact: connection.ConnectedEntityId
    });

    // Update connection with associated user account ID
    await db.update('connections.json', connection.UniqueId, {
      ContactDetails: {
        ...connection.ContactDetails,
        AssociatedUserAccount: newUser.UniqueId
      }
    });

    req.flash('success_msg', `Contact successfully converted to user account. Login email: ${contactEmail}`);
    res.redirect('/contacts');
  } catch (error) {
    console.error('Error converting contact to user:', error);
    req.flash('error_msg', 'Error converting contact to user');
    res.redirect(`/contacts/${req.params.id}/convert-to-user`);
  }
});

module.exports = router;

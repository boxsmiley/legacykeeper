const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../models/database');

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login');
});

// Login handler
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const users = db.findAll('users.json');
    const user = users.find(u => u.Email === email);

    if (!user) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.PasswordHash || '');

    if (!isMatch) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/login');
    }

    req.session.user = {
      UniqueId: user.UniqueId,
      Email: user.Email,
      FirstName: user.FirstName,
      LastName: user.LastName,
      Role: user.Role,
      ProfilePicture: user.ProfilePicture || ''
    };

    req.flash('success_msg', 'Login successful');
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'An error occurred');
    res.redirect('/login');
  }
});

// Register page
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/register');
});

// Register handler
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, password2 } = req.body;

  if (password !== password2) {
    req.flash('error_msg', 'Passwords do not match');
    return res.redirect('/register');
  }

  try {
    const users = db.findAll('users.json');
    const existingUser = users.find(u => u.Email === email);

    if (existingUser) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = db.create('users.json', {
      FirstName: firstName,
      MiddleName: '',
      LastName: lastName,
      Email: email,
      PasswordHash: hashedPassword,
      DateOfBirth: '',
      PhoneNumber: '',
      MailingAddress: '',
      Role: 'user',
      AccountStatus: 'active',
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
      CreatedBy: 'self'
    });

    req.flash('success_msg', 'Registration successful. Please login.');
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'An error occurred during registration');
    res.redirect('/register');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/login');
  });
});

module.exports = router;

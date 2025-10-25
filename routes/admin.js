const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models/database');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profile-pictures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

// Apply authentication and admin middleware
router.use(ensureAuthenticated);
router.use(ensureAdmin);

// Admin dashboard - list all users
router.get('/users', async (req, res) => {
  const users = await db.findAll('users.json');
  res.render('admin/users', { users });
});

// Create user page
router.get('/users/new', async (req, res) => {
  res.render('admin/user-form', { user: null, action: 'create' });
});

// Create user
router.post('/users', upload.single('profilePictureFile'), async (req, res) => {
  const {
    FirstName,
    MiddleName,
    LastName,
    Email,
    Password,
    DateOfBirth,
    PhoneNumber,
    MailingAddress,
    Role,
    AccountStatus,
    MFA_Enabled,
    SocialSecurityNumber
  } = req.body;

  try {
    const users = await db.findAll('users.json');
    const existingUser = users.find(u => u.Email === Email);

    if (existingUser) {
      req.flash('error_msg', 'Email already exists');
      return res.redirect('/admin/users/new');
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    // Set profile picture path if file was uploaded
    let profilePicturePath = '';
    if (req.file) {
      profilePicturePath = '/uploads/profile-pictures/' + req.file.filename;
    }

    db.create('users.json', {
      FirstName,
      MiddleName: MiddleName || '',
      LastName,
      Email,
      PasswordHash: hashedPassword,
      DateOfBirth: DateOfBirth || '',
      PhoneNumber: PhoneNumber || '',
      MailingAddress: MailingAddress || '',
      Role: Role || 'user',
      AccountStatus: AccountStatus || 'active',
      MFA_Enabled: MFA_Enabled === 'true',
      SocialSecurityNumber: SocialSecurityNumber || '',
      ProfilePicture: profilePicturePath,
      AssignedRoles: [],
      TestRoles: [],
      OwnedContacts: [],
      OwnedContactGroups: [],
      OwnedContractGroups: [],
      OwnedDocuments: [],
      OwnedDigitalAssets: [],
      OwnedFinancialAssets: [],
      SocialNetworks: [],
      CreatedBy: req.session.user.UniqueId
    });

    req.flash('success_msg', 'User created successfully');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating user');
    res.redirect('/admin/users/new');
  }
});

// Edit user page
router.get('/users/:id/edit', async (req, res) => {
  const user = await db.findById('users.json', req.params.id);
  if (!user) {
    req.flash('error_msg', 'User not found');
    return res.redirect('/admin/users');
  }
  res.render('admin/user-form', { user, action: 'edit' });
});

// Update user
router.put('/users/:id', upload.single('profilePictureFile'), async (req, res) => {
  const {
    FirstName,
    MiddleName,
    LastName,
    Email,
    Password,
    DateOfBirth,
    PhoneNumber,
    MailingAddress,
    Role,
    AccountStatus,
    MFA_Enabled,
    SocialSecurityNumber
  } = req.body;

  try {
    const user = await db.findById('users.json', req.params.id);

    const updates = {
      FirstName,
      MiddleName: MiddleName || '',
      LastName,
      Email,
      DateOfBirth: DateOfBirth || '',
      PhoneNumber: PhoneNumber || '',
      MailingAddress: MailingAddress || '',
      Role,
      AccountStatus,
      MFA_Enabled: MFA_Enabled === 'true',
      SocialSecurityNumber: SocialSecurityNumber || ''
    };

    // Handle profile picture upload
    if (req.file) {
      // Delete old profile picture if it exists
      if (user.ProfilePicture && user.ProfilePicture.startsWith('/uploads/profile-pictures/')) {
        const oldFilePath = path.join(__dirname, '..', user.ProfilePicture);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      updates.ProfilePicture = '/uploads/profile-pictures/' + req.file.filename;
    } else {
      // Keep existing profile picture if no new file uploaded
      updates.ProfilePicture = user.ProfilePicture || '';
    }

    if (Password && Password.trim() !== '') {
      updates.PasswordHash = await bcrypt.hash(Password, 10);
    }

    db.update('users.json', req.params.id, updates);

    req.flash('success_msg', 'User updated successfully');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating user');
    res.redirect(`/admin/users/${req.params.id}/edit`);
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    db.delete('users.json', req.params.id);
    req.flash('success_msg', 'User deleted successfully');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting user');
    res.redirect('/admin/users');
  }
});

module.exports = router;

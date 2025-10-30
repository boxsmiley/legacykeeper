const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

router.use(ensureAuthenticated);

// View profile
router.get('/', async (req, res) => {
  const user = await db.findById('users.json', req.session.user.UniqueId);
  if (!user) {
    req.flash('error_msg', 'User not found');
    return res.redirect('/dashboard');
  }
  res.render('profile/index', { user });
});

// Edit profile form
router.get('/edit', async (req, res) => {
  const user = await db.findById('users.json', req.session.user.UniqueId);
  if (!user) {
    req.flash('error_msg', 'User not found');
    return res.redirect('/dashboard');
  }
  res.render('profile/edit', { user });
});

// Update profile
router.post('/update', upload.single('profilePicture'), async (req, res) => {
  const {
    FirstName,
    MiddleName,
    LastName,
    Email,
    DateOfBirth,
    PhoneNumber,
    MailingAddress,
    currentPassword,
    newPassword,
    confirmPassword
  } = req.body;

  try {
    const user = await db.findById('users.json', req.session.user.UniqueId);

    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/profile');
    }

    const updates = {
      FirstName: FirstName || user.FirstName,
      MiddleName: MiddleName || '',
      LastName: LastName || user.LastName,
      Email: Email || user.Email,
      DateOfBirth: DateOfBirth || user.DateOfBirth || '',
      PhoneNumber: PhoneNumber || user.PhoneNumber || '',
      MailingAddress: MailingAddress || user.MailingAddress || ''
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
    }

    // Handle password change
    if (newPassword && newPassword.trim() !== '') {
      if (newPassword !== confirmPassword) {
        req.flash('error_msg', 'New passwords do not match');
        return res.redirect('/profile/edit');
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword || '', user.PasswordHash || '');
      if (!isMatch) {
        req.flash('error_msg', 'Current password is incorrect');
        return res.redirect('/profile/edit');
      }

      updates.PasswordHash = await bcrypt.hash(newPassword, 10);
    }

    await db.update('users.json', req.session.user.UniqueId, updates);

    // Update session
    req.session.user.FirstName = updates.FirstName;
    req.session.user.LastName = updates.LastName;
    req.session.user.Email = updates.Email;
    if (updates.ProfilePicture) {
      req.session.user.ProfilePicture = updates.ProfilePicture;
    }

    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    req.flash('error_msg', 'Error updating profile');
    res.redirect('/profile/edit');
  }
});

// Connect Facebook - initiate OAuth
router.get('/connect/facebook', async (req, res) => {
  // Store return URL in session
  req.session.returnTo = '/profile';
  res.redirect('/auth/facebook');
});

// Disconnect Facebook
router.post('/disconnect/facebook', async (req, res) => {
  try {
    const user = await db.findById('users.json', req.session.user.UniqueId);

    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/profile');
    }

    // Remove Facebook data from SocialNetworks array
    const updatedSocialNetworks = (user.SocialNetworks || []).filter(
      network => network.platform !== 'facebook'
    );

    await db.update('users.json', req.session.user.UniqueId, {
      SocialNetworks: updatedSocialNetworks
    });

    req.flash('success_msg', 'Facebook account disconnected');
    res.redirect('/profile');
  } catch (error) {
    console.error('Error disconnecting Facebook:', error);
    req.flash('error_msg', 'Error disconnecting Facebook');
    res.redirect('/profile');
  }
});

module.exports = router;

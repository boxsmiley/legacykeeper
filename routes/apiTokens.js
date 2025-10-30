const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// List all API tokens for the user
router.get('/', async (req, res) => {
  try {
    const allTokens = await db.findAll('api_tokens.json');
    const userTokens = allTokens.filter(t => t.UserId === req.session.user.UniqueId);

    // Sort by creation date, newest first
    userTokens.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

    // Get new token from session if it exists
    const newToken = req.session.newToken;
    delete req.session.newToken; // Clear it after retrieving

    res.render('apiTokens/index', { tokens: userTokens, newToken });
  } catch (error) {
    console.error('Error loading API tokens:', error);
    req.flash('error_msg', 'Error loading API tokens');
    res.redirect('/dashboard');
  }
});

// Generate new API token
router.post('/generate', async (req, res) => {
  try {
    const { TokenName, ExpiresIn } = req.body;

    if (!TokenName || TokenName.trim() === '') {
      req.flash('error_msg', 'Token name is required');
      return res.redirect('/api-tokens');
    }

    // Generate a secure random token
    const token = 'lk_' + crypto.randomBytes(32).toString('hex');

    // Calculate expiration date
    let expiresAt = null;
    if (ExpiresIn && ExpiresIn !== 'never') {
      const now = new Date();
      switch (ExpiresIn) {
        case '7d':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    // Create token record
    const newToken = await db.create('api_tokens.json', {
      UserId: req.session.user.UniqueId,
      TokenName: TokenName.trim(),
      Token: token,
      ExpiresAt: expiresAt ? expiresAt.toISOString() : null,
      Status: 'active',
      LastUsedAt: null,
      CreatedBy: req.session.user.UniqueId
    });

    // Store the token in session to display once
    req.session.newToken = {
      id: newToken.UniqueId,
      name: TokenName.trim(),
      token: token
    };

    req.flash('success_msg', 'API token generated successfully');
    res.redirect('/api-tokens');
  } catch (error) {
    console.error('Error generating API token:', error);
    req.flash('error_msg', 'Error generating API token');
    res.redirect('/api-tokens');
  }
});

// Revoke API token
router.post('/:id/revoke', async (req, res) => {
  try {
    const token = await db.findById('api_tokens.json', req.params.id);

    if (!token || token.UserId !== req.session.user.UniqueId) {
      req.flash('error_msg', 'API token not found');
      return res.redirect('/api-tokens');
    }

    // Update token status to revoked
    await db.update('api_tokens.json', req.params.id, {
      Status: 'revoked',
      RevokedAt: new Date().toISOString()
    });

    req.flash('success_msg', 'API token revoked successfully');
    res.redirect('/api-tokens');
  } catch (error) {
    console.error('Error revoking API token:', error);
    req.flash('error_msg', 'Error revoking API token');
    res.redirect('/api-tokens');
  }
});

// Delete API token
router.delete('/:id', async (req, res) => {
  try {
    const token = await db.findById('api_tokens.json', req.params.id);

    if (!token || token.UserId !== req.session.user.UniqueId) {
      req.flash('error_msg', 'API token not found');
      return res.redirect('/api-tokens');
    }

    await db.delete('api_tokens.json', req.params.id);

    req.flash('success_msg', 'API token deleted successfully');
    res.redirect('/api-tokens');
  } catch (error) {
    console.error('Error deleting API token:', error);
    req.flash('error_msg', 'Error deleting API token');
    res.redirect('/api-tokens');
  }
});

module.exports = router;

const db = require('../models/database');

// API Token Authentication middleware
async function authenticateApiToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Find token in database
    const allTokens = await db.findAll('api_tokens.json');
    const apiToken = allTokens.find(t => t.Token === token);

    if (!apiToken) {
      return res.status(401).json({ error: 'Invalid API token' });
    }

    // Check if token is revoked
    if (apiToken.Status === 'revoked') {
      return res.status(401).json({ error: 'API token has been revoked' });
    }

    // Check if token is expired
    if (apiToken.ExpiresAt && new Date(apiToken.ExpiresAt) < new Date()) {
      return res.status(401).json({ error: 'API token has expired' });
    }

    // Get user associated with token
    const user = await db.findById('users.json', apiToken.UserId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user account is active
    if (user.AccountStatus !== 'active') {
      return res.status(401).json({ error: 'User account is not active' });
    }

    // Update last used timestamp
    await db.update('api_tokens.json', apiToken.UniqueId, {
      LastUsedAt: new Date().toISOString()
    });

    // Attach user to request
    req.user = user;
    req.apiToken = apiToken;
    req.isApiAuth = true;

    next();
  } catch (error) {
    console.error('Error authenticating API token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Combined authentication middleware (supports both session and API token)
async function ensureAuthenticated(req, res, next) {
  // Check for API token authentication first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateApiToken(req, res, next);
  }

  // Fall back to session authentication
  if (req.session.user) {
    req.user = req.session.user;
    req.isApiAuth = false;
    return next();
  }

  // For API requests, return JSON error
  if (req.path.startsWith('/api/') || req.headers.accept === 'application/json') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // For web requests, redirect to login
  req.flash('error_msg', 'Please log in to view this resource');
  res.redirect('/login');
}

// Admin middleware
function ensureAdmin(req, res, next) {
  const user = req.user || req.session.user;

  if (user && user.Role === 'admin') {
    return next();
  }

  // For API requests, return JSON error
  if (req.isApiAuth || req.path.startsWith('/api/') || req.headers.accept === 'application/json') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  // For web requests, redirect to dashboard
  req.flash('error_msg', 'Access denied. Admin privileges required.');
  res.redirect('/dashboard');
}

module.exports = { ensureAuthenticated, ensureAdmin, authenticateApiToken };

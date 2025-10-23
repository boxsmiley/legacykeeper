// Authentication middleware
function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in to view this resource');
  res.redirect('/login');
}

// Admin middleware
function ensureAdmin(req, res, next) {
  if (req.session.user && req.session.user.Role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Admin privileges required.');
  res.redirect('/dashboard');
}

module.exports = { ensureAuthenticated, ensureAdmin };

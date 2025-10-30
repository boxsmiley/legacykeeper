require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const messagesRoutes = require('./routes/messages');
const chatRoutes = require('./routes/chat');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const documentRoutes = require('./routes/documents');
const contactRoutes = require('./routes/contacts');
const contactGroupRoutes = require('./routes/contactGroups');
const digitalAssetRoutes = require('./routes/digitalAssets');
const financialAssetRoutes = require('./routes/financialAssets');
const legacyEntryRoutes = require('./routes/legacyEntries');
const auditLogRoutes = require('./routes/auditLogs');
const subscriptionRoutes = require('./routes/subscriptions');
const subscriptionPlanRoutes = require('./routes/subscriptionPlans');
const connectionsRoutes = require('./routes/connections');
const apiTokenRoutes = require('./routes/apiTokens');
const executorNotificationsRoutes = require('./routes/executorNotifications');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'legacy-keeper-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use(flash());

// Configure Passport (must be after session)
require('./config/passport')(app);

// Global variables middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', authRoutes);
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/messages', messagesRoutes);
app.use('/chat', chatRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/documents', documentRoutes);
app.use('/contacts', contactRoutes);
app.use('/contact-groups', contactGroupRoutes);
app.use('/digital-assets', digitalAssetRoutes);
app.use('/financial-assets', financialAssetRoutes);
app.use('/legacy-entries', legacyEntryRoutes);
app.use('/audit-logs', auditLogRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/subscription-plans', subscriptionPlanRoutes);
app.use('/connections', connectionsRoutes);
app.use('/api-tokens', apiTokenRoutes);
app.use('/executor-notifications', executorNotificationsRoutes.router);

// API Documentation route
app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api-docs.html'));
});

// Serve OpenAPI spec
app.get('/openapi.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, 'openapi.yaml'));
});

// Home route
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// Start server
app.listen(PORT, () => {
  console.log(`LegacyKeeper server running on http://localhost:${PORT}`);
});

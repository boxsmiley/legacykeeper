const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const db = require('../models/database');

module.exports = function(app) {
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user for the session
  passport.serializeUser((user, done) => {
    done(null, user.UniqueId);
  });

  // Deserialize user from the session
  passport.deserializeUser((id, done) => {
    const user = db.findById('users.json', id);
    done(null, user);
  });

  // Facebook Strategy Configuration
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'name', 'emails', 'birthday', 'picture.type(large)', 'hometown', 'location'],
      passReqToCallback: true
    },
    async function(req, accessToken, refreshToken, profile, done) {
      try {
        // Check if user is logged in
        if (!req.session.user) {
          return done(null, false, { message: 'Please log in first to connect your Facebook account' });
        }

        const user = db.findById('users.json', req.session.user.UniqueId);

        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        // Extract Facebook profile data
        const facebookData = {
          platform: 'facebook',
          facebookId: profile.id,
          displayName: profile.displayName,
          firstName: profile.name?.givenName || '',
          middleName: profile.name?.middleName || '',
          lastName: profile.name?.familyName || '',
          email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : '',
          profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
          birthday: profile._json.birthday || '',
          hometown: profile._json.hometown?.name || '',
          location: profile._json.location?.name || '',
          connectedAt: new Date().toISOString(),
          accessToken: accessToken
        };

        // Check if Facebook is already connected
        const existingSocialNetworks = user.SocialNetworks || [];
        const facebookIndex = existingSocialNetworks.findIndex(sn => sn.platform === 'facebook');

        let updatedSocialNetworks;
        if (facebookIndex !== -1) {
          // Update existing Facebook connection
          updatedSocialNetworks = [...existingSocialNetworks];
          updatedSocialNetworks[facebookIndex] = facebookData;
        } else {
          // Add new Facebook connection
          updatedSocialNetworks = [...existingSocialNetworks, facebookData];
        }

        // Prepare updates for user profile
        const updates = {
          SocialNetworks: updatedSocialNetworks
        };

        // Optionally import profile data if user's fields are empty
        if (!user.FirstName && facebookData.firstName) {
          updates.FirstName = facebookData.firstName;
        }
        if (!user.MiddleName && facebookData.middleName) {
          updates.MiddleName = facebookData.middleName;
        }
        if (!user.LastName && facebookData.lastName) {
          updates.LastName = facebookData.lastName;
        }
        if (!user.DateOfBirth && facebookData.birthday) {
          updates.DateOfBirth = facebookData.birthday;
        }
        if (!user.ProfilePicture && facebookData.profilePicture) {
          updates.ProfilePicture = facebookData.profilePicture;
        }

        // Update user in database
        db.update('users.json', user.UniqueId, updates);

        // Update session
        req.session.user.FirstName = updates.FirstName || req.session.user.FirstName;
        req.session.user.LastName = updates.LastName || req.session.user.LastName;
        req.session.user.ProfilePicture = updates.ProfilePicture || req.session.user.ProfilePicture;

        return done(null, user);
      } catch (error) {
        console.error('Facebook authentication error:', error);
        return done(error);
      }
    }));
  } else {
    console.warn('Facebook OAuth not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env file');
  }
};

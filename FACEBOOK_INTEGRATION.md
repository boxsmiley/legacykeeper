# Facebook Integration Setup Guide

This guide explains how to set up Facebook OAuth integration to allow users to connect their Facebook accounts and import profile data into LegacyKeeper.

## Features

- **Facebook OAuth Login**: Secure authentication via Facebook
- **Profile Data Import**: Automatically import user information including:
  - Name (First, Middle, Last)
  - Email address
  - Profile picture
  - Date of birth
  - Hometown
  - Current location
- **Account Management**: Connect/disconnect Facebook from user profile page
- **Data Display**: View all imported Facebook data in the profile

## Setup Instructions

### 1. Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Consumer** as the app type
4. Fill in:
   - **App Name**: LegacyKeeper (or your preferred name)
   - **App Contact Email**: Your email address
5. Click **Create App**

### 2. Configure Facebook Login

1. In your app dashboard, go to **Add Product**
2. Find **Facebook Login** and click **Set Up**
3. Choose **Web** as the platform
4. Enter your site URL: `http://localhost:3000` (for development)
5. Go to **Facebook Login** → **Settings** in the left sidebar
6. Add OAuth Redirect URIs:
   ```
   http://localhost:3000/auth/facebook/callback
   ```
   For production, add your production domain:
   ```
   https://yourdomain.com/auth/facebook/callback
   ```
7. Save changes

### 3. Configure App Settings

1. Go to **Settings** → **Basic**
2. Copy your **App ID** and **App Secret**
3. Add **App Domains**:
   - Development: `localhost`
   - Production: your actual domain
4. Under **Privacy Policy URL** and **Terms of Service URL**, add appropriate URLs (required for public apps)

### 4. Configure Environment Variables

1. Open the `.env` file in the project root
2. Update the Facebook configuration:

```env
# Facebook OAuth Configuration
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback
```

Replace:
- `your_app_id_here` with your Facebook App ID
- `your_app_secret_here` with your Facebook App Secret

### 5. Request Permissions (Optional)

By default, the integration requests these permissions:
- `email` - User's email address
- `user_birthday` - Date of birth
- `user_hometown` - Hometown information
- `user_location` - Current city/location

To request additional permissions:
1. Update the scope in `routes/auth.js`:
   ```javascript
   router.get('/facebook',
     passport.authenticate('facebook', {
       scope: ['email', 'user_birthday', 'user_hometown', 'user_location', 'your_additional_permission']
     })
   );
   ```
2. Go to your Facebook App → **App Review** → **Permissions and Features**
3. Request review for additional permissions if needed

### 6. Test the Integration

1. Start the server:
   ```bash
   npm start
   ```

2. Log in to LegacyKeeper with your user account

3. Navigate to your profile:
   - Click on your name in the navigation bar
   - Or go to `http://localhost:3000/profile`

4. Click **Connect Facebook** button

5. Authorize the app when prompted by Facebook

6. You'll be redirected back to your profile with imported data

## How It Works

### OAuth Flow

1. User clicks "Connect Facebook" on their profile page
2. User is redirected to Facebook for authentication
3. Facebook asks user to authorize the app
4. Upon approval, Facebook redirects back to `/auth/facebook/callback`
5. The app receives an access token and user profile data
6. Profile data is saved to the user's `SocialNetworks` array
7. Empty user profile fields are filled with Facebook data
8. User is redirected to their profile page

### Data Storage

Facebook data is stored in the user's `SocialNetworks` array in `users.json`:

```json
{
  "SocialNetworks": [
    {
      "platform": "facebook",
      "facebookId": "1234567890",
      "displayName": "John Doe",
      "firstName": "John",
      "middleName": "",
      "lastName": "Doe",
      "email": "john@example.com",
      "profilePicture": "https://...",
      "birthday": "01/15/1990",
      "hometown": "New York, NY",
      "location": "San Francisco, CA",
      "connectedAt": "2025-10-23T12:00:00.000Z",
      "accessToken": "..."
    }
  ]
}
```

### Auto-Import Logic

The integration automatically imports Facebook data **only if** the corresponding user field is empty:
- If `FirstName` is empty → import from Facebook
- If `LastName` is empty → import from Facebook
- If `DateOfBirth` is empty → import from Facebook
- If `ProfilePicture` is empty → import from Facebook

This prevents overwriting existing user data.

## Disconnecting Facebook

Users can disconnect their Facebook account:
1. Go to profile page
2. Click **Disconnect** next to the Facebook connection
3. All Facebook data is removed from `SocialNetworks`
4. User profile data imported from Facebook is **not** deleted

## Production Deployment

### 1. Update Environment Variables

```env
FACEBOOK_APP_ID=your_production_app_id
FACEBOOK_APP_SECRET=your_production_app_secret
FACEBOOK_CALLBACK_URL=https://yourdomain.com/auth/facebook/callback
```

### 2. Update Facebook App Settings

1. Go to **Settings** → **Basic**
2. Update **App Domains** with your production domain
3. Go to **Facebook Login** → **Settings**
4. Add production OAuth Redirect URI: `https://yourdomain.com/auth/facebook/callback`

### 3. Make App Public (Optional)

By default, your app is in development mode (only accessible to testers):
1. Go to **Settings** → **Basic**
2. Toggle **App Mode** from Development to Live
3. Note: You'll need to complete App Review for certain permissions

## Troubleshooting

### "URL Blocked: This redirect failed because the redirect URI is not whitelisted"

**Solution**: Add the callback URL to OAuth Redirect URIs in Facebook Login settings.

### "Can't Load URL: The domain of this URL isn't included in the app's domains"

**Solution**: Add your domain to App Domains in Settings → Basic.

### "Please log in first to connect your Facebook account"

**Solution**: User must be logged in to LegacyKeeper before connecting Facebook. This is by design.

### Facebook connection succeeds but no data is imported

**Solution**:
1. Check that permissions are granted (user might have declined)
2. Verify `profileFields` in `config/passport.js` match your requested permissions
3. Check console logs for errors

### "Facebook OAuth not configured" warning

**Solution**: Set `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` in your `.env` file.

## Security Notes

- **Never commit** `.env` file to version control (add to `.gitignore`)
- **Rotate secrets** if they are compromised
- Store access tokens securely in the database
- Consider encrypting sensitive data at rest
- Use HTTPS in production (required by Facebook)
- Implement rate limiting for OAuth endpoints
- Review Facebook's Platform Policies regularly

## Additional Resources

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api)
- [Passport.js Documentation](http://www.passportjs.org/)
- [Facebook App Review Process](https://developers.facebook.com/docs/app-review)

## Support

If you encounter issues:
1. Check the server console for error messages
2. Verify all environment variables are set correctly
3. Ensure Facebook app is properly configured
4. Check that the user is logged in before connecting Facebook
5. Review the troubleshooting section above

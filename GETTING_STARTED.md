# Getting Started with LegacyKeeper

## Quick Start

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open your browser:**
   Navigate to `http://localhost:3000`

3. **Create your first account:**
   - Click "Register here" on the login page
   - Fill in your information
   - You'll be redirected to login

4. **Make yourself an admin (optional):**
   - Stop the server (Ctrl+C)
   - Edit `data/users.json`
   - Change your user's `"Role"` from `"user"` to `"admin"`
   - Restart the server
   - Log in again to access the Admin panel

## What You Can Do

### User Dashboard
After logging in, you'll see your dashboard with:
- Overview statistics of all your data
- Quick links to manage each category

### Documents
Manage important documents:
- Legal documents
- Financial records
- Medical records
- Personal files

### Contacts
Store information about important people:
- Family members
- Friends
- Professional contacts
- Executors

### Contact Groups
Organize contacts into groups:
- Family
- Friends
- Professional network
- Beneficiaries

### Digital Assets
Track online accounts and credentials:
- Social media accounts
- Email accounts
- Cloud storage
- Domain names
- Subscriptions

### Financial Assets
Manage financial account information:
- Bank accounts
- Credit cards
- Investment accounts
- Retirement accounts
- Insurance policies
- Cryptocurrency wallets

### Admin Panel (Admin users only)
- View all users
- Create new users
- Edit user information
- Delete users
- Manage roles and permissions

## Tips

1. **Security First**: This is a development version. For production:
   - Use HTTPS
   - Encrypt sensitive data
   - Use a proper database
   - Add authentication tokens

2. **Backup Your Data**: The `data/` folder contains all your information in JSON files. Back it up regularly.

3. **Multiple Users**: Each user only sees their own data. Admin users can manage all users but don't see other users' personal data.

## Development

For development with auto-reload:
```bash
npm run dev
```

## Troubleshooting

**Port already in use:**
- Change the PORT in `server.js` or set environment variable:
  ```bash
  PORT=3001 npm start
  ```

**Can't login:**
- Check `data/users.json` exists and is valid JSON
- Ensure passwords are being hashed (check for `PasswordHash` field)

**Data not saving:**
- Check file permissions on the `data/` directory
- Ensure `data/` directory exists

## Next Steps

Consider adding:
- File upload functionality for documents
- Email notifications
- Two-factor authentication
- Data export/import
- Search functionality
- Activity logging
- Beneficiary access system

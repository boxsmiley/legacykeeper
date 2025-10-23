# LegacyKeeper

A digital asset and legacy management system built with Node.js, Express, and EJS.

## Features

- User authentication (register, login, logout)
- Dark theme by default
- User dashboard with statistics
- Document management
- Contact management
- Contact group management
- Digital asset tracking (social media, email, cloud storage, etc.)
- Financial asset tracking (bank accounts, investments, insurance, etc.)
- Admin panel for user management

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Default Accounts

To create an admin account:
1. Register a new user at `/register`
2. The first user created will need to be manually set as admin in the data file
3. Navigate to `data/users.json` and change the `Role` field to `"admin"`

## Project Structure

```
legacykeeper/
├── data/                    # JSON file storage
├── middleware/              # Express middleware
│   └── auth.js             # Authentication middleware
├── models/                  # Data models
│   └── database.js         # Database abstraction layer
├── public/                  # Static files
│   └── css/
│       └── style.css       # Dark theme styles
├── routes/                  # Express routes
│   ├── admin.js            # Admin routes
│   ├── auth.js             # Authentication routes
│   ├── contactGroups.js    # Contact group routes
│   ├── contacts.js         # Contact routes
│   ├── dashboard.js        # Dashboard routes
│   ├── digitalAssets.js    # Digital asset routes
│   ├── documents.js        # Document routes
│   └── financialAssets.js  # Financial asset routes
├── views/                   # EJS templates
│   ├── admin/              # Admin views
│   ├── auth/               # Login/register views
│   ├── contactGroups/      # Contact group views
│   ├── contacts/           # Contact views
│   ├── dashboard/          # Dashboard views
│   ├── digitalAssets/      # Digital asset views
│   ├── documents/          # Document views
│   ├── financialAssets/    # Financial asset views
│   └── partials/           # Reusable view components
├── package.json
├── server.js               # Main server file
└── README.md
```

## Features by Role

### Regular Users
- View and manage their own documents
- Create and manage contacts
- Organize contacts into groups
- Track digital assets (passwords, accounts)
- Track financial assets (bank accounts, investments)
- Personal dashboard with statistics

### Admin Users
- All regular user features
- View all users in the system
- Create new users
- Edit user information
- Delete users
- Manage user roles and status

## Security Notes

⚠️ **Important**: This is a development version. For production use:
- Implement proper password encryption for stored credentials
- Add HTTPS support
- Use environment variables for sensitive configuration
- Implement proper session management
- Add input validation and sanitization
- Consider using a real database (PostgreSQL, MongoDB, etc.)
- Implement rate limiting
- Add CSRF protection
- Implement proper logging

## Data Storage

Data is stored in JSON files in the `data/` directory:
- `users.json` - User accounts
- `documents.json` - Document records
- `contacts.json` - Contact information
- `contact_groups.json` - Contact groups
- `digital_assets.json` - Digital asset credentials
- `financial_assets.json` - Financial asset information

## License

ISC
# legacykeeper

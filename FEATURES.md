# LegacyKeeper - Complete Feature List

## All JSON Schemas Implemented

### User Management (user.json)
**All Fields Included:**
- Basic Info: FirstName, MiddleName, LastName, Email, DateOfBirth
- Contact: PhoneNumber, MailingAddress
- Security: PasswordHash, MFA_Enabled, SocialSecurityNumber
- Account: Role, AccountStatus, ProfilePicture
- System: UniqueId, CreatedDate, ModifiedDate, Slug, CreatedBy
- Relationships: AssignedRoles, TestRoles, OwnedContacts, OwnedContactGroups, OwnedContractGroups, OwnedDocuments, OwnedDigitalAssets, OwnedFinancialAssets, SocialNetworks

**Features:**
- Complete user registration and authentication
- Full admin panel with all user fields
- Multi-factor authentication toggle
- Profile management
- Role-based access control (user, admin, executor)

### Documents (documents.json)
**Fields:** FileName, DocumentType, Description, FileType, FileSize, DateUploaded, BubbleFile, OwnerUser, PhysicalLocation, Version, PermittedUsers, PermittedContactGroups

**Features:**
- Document management with categorization
- File metadata tracking
- Permission management
- Version control

### Contacts (contacts.json)
**Fields:** FirstName, LastName, Email, PhoneNumber, Address, Relationship, Notes, DateAdded, OwnerUser, AssociatedUserAccount

**Features:**
- Complete contact management
- Relationship categorization
- Contact details storage
- User account linking

### Contact Groups (contact_groups.json)
**Fields:** GroupName, Description, Members, OwnerUser

**Features:**
- Organize contacts into groups
- Multiple member management
- Group descriptions

### Digital Assets (digital_assets.json)
**Fields:** AssetName, AssetType, DateAdded, LoginURL, Notes, OwnerUser, PasswordKey, UsernameIdentifier

**Features:**
- Digital account credential storage
- Asset categorization (Social Media, Email, Cloud Storage, Websites, Domains, Subscriptions)
- Secure password storage (with encryption notes)
- Login URL management

### Financial Assets (financial_assets.json)
**Fields:** AssetName, AssetType, DateAdded, LoginURL, Notes, OwnerUser, PasswordKey, UsernameIdentifier

**Features:**
- Financial account tracking
- Asset types: Bank Accounts, Credit Cards, Investments, Retirement, Insurance, Cryptocurrency, Loans
- Secure credential management
- Account access information

### Legacy Entries (legacyentries.json)
**Fields:** ContentText, DateCreated, EntryTitle, LegacyEntryType, MediaFile, OwnerUser

**Features:**
- Personal legacy messages and stories
- Entry types: Memory, Message, Story, Advice, Letter, Video, Audio, Photo
- Media file attachments
- Content preservation

### Subscription Plans (subscriptionplans.json)
**Fields:** FeatureList, PriceAnnual, PriceMonthly, StorageLimitGB, SubscriptionLevel, WorkUnitLimit

**Features:**
- Plan management (Admin only)
- Pricing tiers (Monthly/Annual)
- Storage and work unit limits
- Feature list management

### Subscriptions (subscription.json)
**Fields:** BillingCycle, EndDate, NextBillingDate, Plan, StartDate, Status, StripeCustomerID, StripeSubscriptionID

**Features:**
- User subscription tracking
- Billing information
- Plan status monitoring
- Stripe integration ready

### Audit Logs (audit_logs.json)
**Fields:** ActingUser, ActionType, Details, IPAddress, TargetThing, Timestamp

**Features:**
- Activity tracking
- User action logs
- IP address logging
- Detailed event information

### Role Assignments (role_assignments.json)
**Fields:** AssignedUser, ContextUser, DateAssigned, GrantingUser, InvitationToken, Role, Status, TokenExpiry

**Features:**
- Role-based access control
- Invitation system ready
- Role assignment tracking
- Token-based invitations

### Document Physical Locations (documents_physical_locations.json)
**Fields:** DateRecorded, KeyCode, LocationDescription, RelatedDocument

**Features:**
- Track physical document locations
- Key code storage
- Location descriptions

### Real Physical Assets (real_physical_assets.json)
**Fields:** Standard metadata fields

**Features:**
- Physical asset tracking
- Asset categorization

### Notification Settings (notification_settings.json)
**Fields:** Standard metadata fields

**Features:**
- User notification preferences
- Alert configuration

### Executor Tasks (executor_tasks.json)
**Fields:** Standard metadata fields

**Features:**
- Task management for executors
- Estate planning support

## Navigation Structure

### User Menu:
- Dashboard - Overview with statistics
- Documents - Document management
- Contacts - Contact management
- Groups - Contact groups
- Digital - Digital assets
- Financial - Financial assets
- Legacy - Legacy entries
- Plans - Subscription management
- Activity - Audit logs

### Admin Menu (Additional):
- Users - User management
- Pricing - Subscription plan management

## Security Features
- Password hashing with bcrypt
- Session-based authentication
- Role-based access control
- User data isolation
- MFA toggle for users
- Secure credential storage notes

## Data Storage
All data stored in JSON files in the `/data` directory:
- users.json
- documents.json
- contacts.json
- contact_groups.json
- digital_assets.json
- financial_assets.json
- legacy_entries.json
- subscriptions.json
- subscription_plans.json
- audit_logs.json
- role_assignments.json
- documents_physical_locations.json
- real_physical_assets.json
- notification_settings.json
- executor_tasks.json

## User Interface
- Dark theme by default
- Responsive design
- Intuitive navigation
- Form validation
- Success/error messaging
- Confirmation dialogs for deletions

## Technical Stack
- **Backend:** Node.js, Express
- **View Engine:** EJS
- **Session Management:** express-session
- **Password Hashing:** bcryptjs
- **Database:** JSON file-based storage
- **Middleware:** body-parser, method-override, connect-flash

## Ready for Production Enhancements
- Stripe payment integration structure in place
- Audit logging system ready
- Role assignment system ready
- MFA field structure ready
- File upload placeholders ready
- Encryption notes for sensitive data

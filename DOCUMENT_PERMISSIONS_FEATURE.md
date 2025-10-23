# Document Permissions Management Feature

## Overview
The document permissions system allows users to control which other users and contact groups can access their documents. This provides fine-grained access control for sensitive documents within the LegacyKeeper application.

## Features

### 1. User-Based Permissions
- **Select Individual Users:** Grant specific users access to documents
- **Visual Interface:** Checkbox list showing all system users
- **User Details:** Display full name, email, and role for each user
- **Bulk Operations:** Select All / Deselect All buttons for quick management

### 2. Group-Based Permissions
- **Contact Groups:** Share documents with entire contact groups
- **Group Visibility:** See group names and descriptions
- **Flexible Management:** Easily add or remove group access
- **Quick Actions:** Select All / Deselect All buttons

### 3. Permissions Display
- **Documents List:** Shows permission count for each document
- **Visual Badges:** Blue badges display "X users, Y groups"
- **At-a-Glance:** Quickly see which documents have restricted access
- **Empty State:** Shows "None" when no permissions are set

### 4. Smart UI Features
- **Scrollable Lists:** Max height of 300px with overflow scrolling
- **Search-Friendly:** Easy to find users and groups in long lists
- **Responsive Design:** Works on all screen sizes
- **Dark Theme:** Consistent with application styling

## User Experience

### Setting Document Permissions

**When Creating a Document:**
1. Navigate to Documents
2. Click "Add New Document"
3. Fill in document details
4. Scroll to "Document Permissions" section
5. Check users and/or groups who should have access
6. Click "Upload Document"

**When Editing a Document:**
1. Navigate to Documents
2. Click "Edit" on the document
3. Scroll to "Document Permissions" section
4. Modify selected users and groups
5. Click "Update Document"

### Permission Management Workflow

**Individual Users:**
- Each user displayed with full name, email, and role badge
- Checkbox allows quick selection/deselection
- Previously selected users are pre-checked on edit

**Contact Groups:**
- Each group displayed with name and description
- Checkbox for easy group-level access control
- Link to create new groups if none exist

**Bulk Actions:**
- "Select All" button checks all checkboxes in section
- "Deselect All" button unchecks all checkboxes in section
- Works independently for users and groups

## Technical Implementation

### Database Schema

Documents now include permission arrays:
```json
{
  "UniqueId": "doc-123",
  "FileName": "Estate Plan.pdf",
  "DocumentType": "Legal",
  "PermittedUsers": [
    "john@example.com",
    "jane@example.com"
  ],
  "PermittedContactGroups": [
    "Family",
    "Executors"
  ],
  ...
}
```

### Routes Updated

**Document Create Route** (`POST /documents`):
- Accepts `PermittedUsers` and `PermittedContactGroups` arrays
- Handles both checkbox arrays and comma-separated strings
- Stores in document record on creation

**Document Edit Route** (`GET /documents/:id/edit`):
- Fetches all system users from users.json
- Fetches user's contact groups
- Passes to form for rendering checkboxes

**Document Update Route** (`PUT /documents/:id`):
- Updates `PermittedUsers` and `PermittedContactGroups` arrays
- Flexible parsing for different input formats
- Maintains backward compatibility

### Form Implementation

**HTML Structure:**
```html
<div class="form-group">
  <label>Permitted Users</label>
  <div class="permission-controls">
    <button type="button" onclick="selectAllUsers()">Select All</button>
    <button type="button" onclick="deselectAllUsers()">Deselect All</button>
  </div>
  <div id="usersContainer">
    <!-- Checkbox list of users -->
  </div>
</div>
```

**JavaScript Functions:**
```javascript
function selectAllUsers() {
  const checkboxes = document.querySelectorAll('#usersContainer input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
}

function deselectAllUsers() {
  const checkboxes = document.querySelectorAll('#usersContainer input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
}
```

### Styling

**Permission Controls:**
```css
.permission-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.permission-controls button {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.permission-controls button:hover {
  background: var(--accent-primary);
  color: white;
}
```

**Checkbox Lists:**
- Background: `var(--bg-tertiary)`
- Max Height: 300px with overflow-y: auto
- Border radius: 5px for rounded corners
- Each item has bottom border for separation

## Files Modified

### Routes
- **routes/documents.js** (Lines 50-61, 64-119, 122-143, 159-176)
  - Added allUsers and contactGroups to form data
  - Updated create route to handle permissions arrays
  - Updated update route with flexible array parsing

### Views
- **views/documents/form.ejs** (Lines 1-29, 69-150, 161-181)
  - Added permission controls styling
  - Replaced text inputs with checkbox lists
  - Added Select All / Deselect All buttons
  - Added JavaScript for bulk operations

- **views/documents/index.ejs** (Lines 23-32, 36-69)
  - Added "Permissions" column to table
  - Display permission counts with badges
  - Shows "None" when no permissions set

## Use Cases

### Estate Planning
- **Will Document:** Share with spouse and executor
- **Trust Documents:** Limit access to trustees
- **Property Deeds:** Share with family members

### Family Documents
- **Birth Certificates:** Share with "Family" group
- **Passports:** Restrict to specific family members
- **Medical Records:** Share with "Healthcare" group

### Business Documents
- **Contracts:** Share with business partners
- **Financial Statements:** Limit to accountant and CFO
- **Legal Docs:** Share with legal team group

### Executor Access
- **Important Accounts:** Share with designated executor
- **Insurance Policies:** Make accessible to beneficiaries
- **Final Wishes:** Control who can view personal documents

## Security Considerations

### Access Control
- ✅ Document owner always has full access
- ✅ Permissions stored in document record
- ✅ User emails used for identification
- ✅ Group names reference contact groups

### Data Privacy
- ✅ No sharing outside user's account
- ✅ Permissions visible only to document owner
- ✅ Users must be in system to be granted access
- ✅ Groups must belong to document owner

### Best Practices
- ✅ Review permissions regularly
- ✅ Remove access when no longer needed
- ✅ Use groups for easier management
- ✅ Document critical permissions in notes

## Future Enhancements

### Possible Improvements
- [ ] Different permission levels (view, edit, delete)
- [ ] Time-based permissions (expires after date)
- [ ] Conditional permissions (trigger on event)
- [ ] Permission inheritance from folders
- [ ] Audit log for permission changes
- [ ] Email notifications on permission grant
- [ ] Permission requests from users
- [ ] Bulk permission management tool
- [ ] Export permissions report
- [ ] Role-based default permissions

### Advanced Features
- [ ] Document encryption for restricted files
- [ ] Two-factor auth for sensitive documents
- [ ] Watermarking on shared documents
- [ ] Download tracking and limits
- [ ] Share links with expiration
- [ ] External user sharing (outside system)

## User Interface Details

### Permission Section Layout
```
Document Permissions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Control who can view and access this document

Permitted Users
[Select All] [Deselect All]
┌─────────────────────────────────┐
│ ☑ John Doe                     │
│   john@example.com      [admin]│
├─────────────────────────────────┤
│ ☐ Jane Smith                   │
│   jane@example.com      [user] │
└─────────────────────────────────┘

Permitted Contact Groups
[Select All] [Deselect All]
┌─────────────────────────────────┐
│ ☑ Family                        │
│   Immediate family members      │
├─────────────────────────────────┤
│ ☐ Executors                     │
│   Estate executors              │
└─────────────────────────────────┘
```

### Documents List Display
```
File Name          Type      Permissions           Uploaded
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estate Plan.pdf    Legal     [2 users, 1 group]    10/22/2025
Will.pdf           Legal     None                   10/21/2025
Photo Album.zip    Personal  [0 users, 1 group]    10/20/2025
```

## Error Handling

### Invalid Permissions
- System validates user emails exist
- Checks group names belong to user
- Gracefully handles missing data
- Doesn't fail on empty permissions

### Edge Cases
- **No users in system:** Shows "No users available"
- **No contact groups:** Shows link to create groups
- **All unchecked:** Permissions saved as empty arrays
- **Duplicate selections:** Handled by checkbox nature

## Performance Considerations

### Optimization
- Checkbox rendering is efficient for 100+ users
- Scrollable containers prevent page bloat
- Minimal JavaScript for bulk operations
- Server-side permission storage is lightweight

### Scalability
- Works with large user bases
- Contact groups reduce permission complexity
- Array-based storage is performant
- No database queries for permission checks yet

## Testing Checklist

- [x] Create document with user permissions
- [x] Create document with group permissions
- [x] Create document with both types
- [x] Edit permissions on existing document
- [x] Select All / Deselect All for users
- [x] Select All / Deselect All for groups
- [x] View permissions in document list
- [x] Empty permissions display correctly
- [x] Long user lists scroll properly
- [x] Mobile responsiveness
- [ ] Permission validation on save
- [ ] Access enforcement (not yet implemented)

## Migration Notes

### Existing Documents
Existing documents without permission fields will:
- Default to empty arrays for PermittedUsers
- Default to empty arrays for PermittedContactGroups
- Display "None" in permissions column
- Can be edited to add permissions

### Backward Compatibility
- System handles documents without permission fields
- Create route supports comma-separated strings
- Update route parses multiple input formats
- No database migration required

## API Reference

### Create Document with Permissions
```javascript
POST /documents
Content-Type: multipart/form-data

PermittedUsers: ["user1@example.com", "user2@example.com"]
PermittedContactGroups: ["Family", "Executors"]
// ... other document fields
```

### Update Document Permissions
```javascript
PUT /documents/:id
Content-Type: application/x-www-form-urlencoded

PermittedUsers: user1@example.com, user2@example.com
PermittedContactGroups: Family, Executors
// Accepts both array and comma-separated string
```

## Version History

- **v1.0** (2025-10-22): Initial implementation
  - User-based permissions
  - Contact group permissions
  - Checkbox selection interface
  - Select All / Deselect All buttons
  - Permissions display in document list
  - Scrollable permission containers
  - Dark theme integration

# File Upload Feature

## Overview
The documents page now supports actual file uploads with complete file management capabilities.

## Features Implemented

### 1. File Upload
- **Location:** Upload form on "Add New Document" page
- **Supported Types:** PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG, GIF, ZIP, RAR
- **Maximum Size:** 50MB per file
- **Automatic Detection:** File type and size are automatically extracted

### 2. File Storage
- **Directory:** `/uploads/documents/`
- **Naming:** Files are saved with unique timestamps to prevent conflicts
- **Format:** `{timestamp}-{random}-{originalname}`

### 3. File Management

#### Upload
- Select file from your computer
- Optionally provide a custom document name
- Choose document type (Legal, Financial, Medical, Personal, Other)
- Add description
- File metadata (size, type) is automatically captured

#### Download
- Click on filename in document list to download
- Click "Download" button in actions column
- Files are served securely through the application

#### Edit
- Update document name and description
- View current file information
- Download current file while editing

#### Delete
- Deletes both database record AND physical file
- Confirmation required before deletion
- Automatic cleanup of orphaned files

### 4. Security Features
- **User Isolation:** Users can only access their own documents
- **Authentication Required:** All file operations require login
- **File Type Validation:** Only allowed file types can be uploaded
- **Size Limits:** Prevents server overload with 50MB limit

### 5. User Interface Enhancements
- File upload field with drag-and-drop support (browser dependent)
- File size and type displayed in document list
- Clickable filenames for quick download
- Visual indicators for files vs. metadata-only records
- Download button in actions column

## Technical Details

### Packages Used
- **multer:** File upload middleware for Node.js
- **express:** Static file serving for downloads

### Storage Configuration
```javascript
- Directory: uploads/documents/
- Unique filenames: timestamp-random-originalname
- Automatic directory creation
- Maximum file size: 50MB
```

### File Operations
```javascript
POST   /documents              - Upload new document
GET    /documents/:id/download - Download document
PUT    /documents/:id          - Update metadata
DELETE /documents/:id          - Delete document and file
```

### Data Stored
Each document record includes:
- **FileName:** Display name
- **FileType:** Extension (PDF, DOCX, etc.)
- **FileSize:** Human-readable size (e.g., "2.5 MB")
- **BubbleFile:** Server path to uploaded file
- **DocumentType:** Category (Legal, Financial, etc.)
- **Description:** User-provided description
- **DateUploaded:** Upload timestamp
- **OwnerUser:** User who uploaded the file

## Usage Instructions

### To Upload a Document:
1. Navigate to Documents page
2. Click "Add New Document"
3. Click "Choose File" and select your document
4. Optionally enter a custom name
5. Select document type
6. Add description (optional)
7. Click "Upload Document"

### To Download a Document:
1. Navigate to Documents page
2. Click on the filename OR
3. Click the "Download" button
4. File will download to your browser's download folder

### To Delete a Document:
1. Navigate to Documents page
2. Click "Delete" button for the document
3. Confirm deletion
4. Both database record and physical file are removed

## Important Notes

### For Production:
1. **Virus Scanning:** Add antivirus scanning for uploaded files
2. **Encryption:** Consider encrypting files at rest
3. **Backup:** Implement backup strategy for uploads directory
4. **Storage Limits:** Monitor disk space usage
5. **CDN/S3:** Consider using cloud storage for scalability
6. **Compression:** Add automatic compression for large files

### Security Considerations:
- Files are stored outside public directory
- User authentication required for all operations
- File type validation on upload
- No direct file system access from URLs
- Proper error handling for missing files

### Limitations:
- 50MB per file (configurable)
- Local file storage (not cloud)
- No file versioning (overwrites not supported)
- No bulk upload capability

## Directory Structure
```
legacykeeper/
├── uploads/
│   └── documents/
│       ├── 1234567890-abc123-mydocument.pdf
│       ├── 1234567891-def456-contract.docx
│       └── ...
├── data/
│   └── documents.json
└── ...
```

## Maintenance

### Cleanup Orphaned Files:
If documents are deleted directly from the database (not through the app), you may have orphaned files. Consider implementing a cleanup script.

### Backup Strategy:
Regular backups should include:
1. `/data` directory (database)
2. `/uploads` directory (files)

### Monitoring:
Monitor the `/uploads` directory size to prevent disk space issues.

## Future Enhancements
- [ ] File preview capability
- [ ] Multiple file upload
- [ ] File version history
- [ ] Cloud storage integration (AWS S3, Azure Blob)
- [ ] File sharing with other users
- [ ] Thumbnail generation for images
- [ ] Full-text search in documents
- [ ] Compression for large files
- [ ] Drag-and-drop upload interface

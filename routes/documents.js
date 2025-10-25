const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedExtensions = /pdf|doc|docx|txt|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|zip|rar/;
    const allowedMimetypes = /pdf|msword|officedocument|text\/plain|sheet|presentation|image|zip|rar|x-rar/;

    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX, images, ZIP, RAR'));
    }
  }
});

router.use(ensureAuthenticated);

// List documents
router.get('/', async (req, res) => {
  const documents = await db.findByField('documents.json', 'OwnerUser', req.session.user.UniqueId);
  res.render('documents/index', { documents });
});

// New document form
router.get('/new', async (req, res) => {
  // Get all users and contact groups for permissions
  const allUsers = await db.findAll('users.json');
  const contactGroups = await db.findByField('contact_groups.json', 'OwnerUser', req.session.user.UniqueId);

  res.render('documents/form', {
    document: null,
    action: 'create',
    allUsers,
    contactGroups
  });
});

// Create document
router.post('/', upload.single('documentFile'), async (req, res) => {
  const { FileName, DocumentType, Description, Version, PhysicalLocation, PermittedUsers, PermittedContactGroups } = req.body;

  // Validate required fields
  if (!DocumentType) {
    req.flash('error_msg', 'Document type is required');
    return res.redirect('/documents/new');
  }

  // Determine filename
  let documentFileName = FileName && FileName.trim() !== ''
    ? FileName.trim()
    : (req.file ? req.file.originalname : 'Untitled Document');

  let fileInfo = {
    FileName: documentFileName,
    FileType: req.file ? path.extname(req.file.originalname).substring(1).toUpperCase() : 'N/A',
    FileSize: req.file ? `${(req.file.size / 1024).toFixed(2)} KB` : 'N/A',
    BubbleFile: req.file ? `/uploads/documents/${req.file.filename}` : ''
  };

  // Parse permitted users and groups (can be array from checkboxes or comma-separated string)
  let permittedUsersArray = [];
  if (PermittedUsers) {
    if (Array.isArray(PermittedUsers)) {
      permittedUsersArray = PermittedUsers;
    } else {
      permittedUsersArray = PermittedUsers.split(',').map(u => u.trim()).filter(u => u.length > 0);
    }
  }

  let permittedGroupsArray = [];
  if (PermittedContactGroups) {
    if (Array.isArray(PermittedContactGroups)) {
      permittedGroupsArray = PermittedContactGroups;
    } else {
      permittedGroupsArray = PermittedContactGroups.split(',').map(g => g.trim()).filter(g => g.length > 0);
    }
  }

  db.create('documents.json', {
    ...fileInfo,
    DocumentType: DocumentType,
    Description: Description || '',
    DateUploaded: new Date().toISOString(),
    OwnerUser: req.session.user.UniqueId,
    PhysicalLocation: PhysicalLocation || '',
    Version: Version || '1.0',
    PermittedUsers: permittedUsersArray,
    PermittedContactGroups: permittedGroupsArray,
    CreatedBy: req.session.user.UniqueId
  });

  req.flash('success_msg', 'Document uploaded successfully');
  res.redirect('/documents');
});

// Edit document form
router.get('/:id/edit', async (req, res) => {
  const document = await db.findById('documents.json', req.params.id);
  if (!document || document.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Document not found');
    return res.redirect('/documents');
  }

  // Get all users and contact groups for permissions
  const allUsers = await db.findAll('users.json');
  const contactGroups = await db.findByField('contact_groups.json', 'OwnerUser', req.session.user.UniqueId);

  res.render('documents/form', {
    document,
    action: 'edit',
    allUsers,
    contactGroups
  });
});

// Update document
router.put('/:id', upload.single('documentFile'), async (req, res) => {
  console.log('=== UPDATE DOCUMENT ROUTE HIT ===');
  console.log('Document ID:', req.params.id);
  console.log('Request Body:', req.body);

  const {
    FileName,
    DocumentType,
    Description,
    Version,
    PhysicalLocation,
    PermittedUsers,
    PermittedContactGroups
  } = req.body;

  const document = await db.findById('documents.json', req.params.id);
  console.log('Found Document:', document);

  if (!document || document.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Document not found');
    return res.redirect('/documents');
  }

  // Parse permitted users and groups (can be array from checkboxes or comma-separated string)
  let permittedUsersArray = [];
  if (PermittedUsers) {
    if (Array.isArray(PermittedUsers)) {
      permittedUsersArray = PermittedUsers;
    } else {
      permittedUsersArray = PermittedUsers.split(',').map(u => u.trim()).filter(u => u.length > 0);
    }
  }

  let permittedGroupsArray = [];
  if (PermittedContactGroups) {
    if (Array.isArray(PermittedContactGroups)) {
      permittedGroupsArray = PermittedContactGroups;
    } else {
      permittedGroupsArray = PermittedContactGroups.split(',').map(g => g.trim()).filter(g => g.length > 0);
    }
  }

  // Build update object - only update editable fields, preserve file-related fields
  const updates = {
    FileName: FileName || document.FileName || 'Untitled Document',
    DocumentType: DocumentType || document.DocumentType || 'Other',
    Description: Description !== undefined ? Description : (document.Description || ''),
    Version: Version || document.Version || '1.0',
    PhysicalLocation: PhysicalLocation !== undefined ? PhysicalLocation : (document.PhysicalLocation || ''),
    PermittedUsers: permittedUsersArray,
    PermittedContactGroups: permittedGroupsArray
  };

  console.log('Updates Object:', updates);

  const updatedDoc = await db.update('documents.json', req.params.id, updates);
  console.log('Updated Document:', updatedDoc);

  req.flash('success_msg', 'Document updated successfully');
  res.redirect('/documents');
});

// Download document
router.get('/:id/download', async (req, res) => {
  const document = await db.findById('documents.json', req.params.id);
  if (!document || document.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Document not found');
    return res.redirect('/documents');
  }

  if (!document.BubbleFile) {
    req.flash('error_msg', 'No file associated with this document');
    return res.redirect('/documents');
  }

  const filePath = path.join(__dirname, '..', document.BubbleFile);

  if (fs.existsSync(filePath)) {
    res.download(filePath, document.FileName);
  } else {
    req.flash('error_msg', 'File not found on server');
    res.redirect('/documents');
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  const document = await db.findById('documents.json', req.params.id);
  if (!document || document.OwnerUser !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Document not found');
    return res.redirect('/documents');
  }

  // Delete physical file if it exists
  if (document.BubbleFile) {
    const filePath = path.join(__dirname, '..', document.BubbleFile);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
  }

  db.delete('documents.json', req.params.id);
  req.flash('success_msg', 'Document deleted successfully');
  res.redirect('/documents');
});

module.exports = router;

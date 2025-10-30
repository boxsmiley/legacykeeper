const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');
const nodemailer = require('nodemailer');

router.use(ensureAuthenticated);

// Get all users for messaging dropdown
async function getAllUsers(currentUserId) {
  const users = await db.findAll('users.json');
  return users.filter(u => u.UniqueId !== currentUserId && u.AccountStatus === 'active');
}

// Get conversation ID between two users
async function getOrCreateConversation(userId1, userId2) {
  const conversations = await db.findAll('conversations.json');

  // Find existing conversation
  const existingConv = conversations.find(conv =>
    conv.Participants.includes(userId1) && conv.Participants.includes(userId2)
  );

  if (existingConv) {
    return existingConv.UniqueId;
  }

  // Create new conversation
  const newConv = await db.create('conversations.json', {
    Participants: [userId1, userId2],
    LastMessageAt: new Date().toISOString(),
    LastMessageText: '',
    UnreadCount: {
      [userId1]: 0,
      [userId2]: 0
    },
    IsActive: true
  });

  return newConv.UniqueId;
}

// Inbox - list all messages
router.get('/', async (req, res) => {
  const messages = await db.findAll('messages.json');

  // Get messages where current user is recipient
  const receivedMessages = messages.filter(m => m.ToUserId === req.session.user.UniqueId);

  // Get messages where current user is sender
  const sentMessages = messages.filter(m => m.FromUserId === req.session.user.UniqueId);

  // Get all users for reference
  const allUsers = await db.findAll('users.json');
  const userMap = {};
  allUsers.forEach(u => {
    userMap[u.UniqueId] = u;
  });

  // Count unread messages
  const unreadCount = receivedMessages.filter(m => !m.IsRead).length;

  res.render('messages/inbox', {
    receivedMessages,
    sentMessages,
    userMap,
    unreadCount
  });
});

// Compose new message
router.get('/compose', async (req, res) => {
  const users = await getAllUsers(req.session.user.UniqueId);
  const recipientId = req.query.to || '';
  res.render('messages/compose', { users, recipientId });
});

// Send message
router.post('/send', async (req, res) => {
  const { ToUserId, Subject, MessageBody, SendEmail } = req.body;

  if (!ToUserId || !MessageBody) {
    req.flash('error_msg', 'Recipient and message body are required');
    return res.redirect('/messages/compose');
  }

  try {
    // Handle multiple recipients (bulk email) or single recipient
    const recipientIds = Array.isArray(ToUserId) ? ToUserId : [ToUserId];

    let successCount = 0;
    let failCount = 0;

    for (const recipientId of recipientIds) {
      try {
        const recipient = await db.findById('users.json', recipientId);
        if (!recipient) {
          console.error(`Recipient not found: ${recipientId}`);
          failCount++;
          continue;
        }

        // Create message in database
        const message = await db.create('messages.json', {
          FromUserId: req.session.user.UniqueId,
          ToUserId: recipientId,
          Subject: Subject || '(No Subject)',
          MessageBody: MessageBody,
          MessageType: 'email',
          IsRead: false,
          ReadAt: '',
          SentAt: new Date().toISOString(),
          ParentMessageId: '',
          ThreadId: '',
          Attachments: []
        });

        // If SendEmail is checked, send actual email notification
        if (SendEmail === 'on' && process.env.EMAIL_ENABLED === 'true') {
          try {
            const transporter = nodemailer.createTransport({
              host: process.env.EMAIL_HOST,
              port: process.env.EMAIL_PORT,
              secure: process.env.EMAIL_SECURE === 'true',
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
              }
            });

            await transporter.sendMail({
              from: process.env.EMAIL_FROM || '"LegacyKeeper" <noreply@legacykeeper.com>',
              to: recipient.Email,
              subject: `New message from ${req.session.user.FirstName} ${req.session.user.LastName}: ${Subject}`,
              html: `
                <h2>You have a new message on LegacyKeeper</h2>
                <p><strong>From:</strong> ${req.session.user.FirstName} ${req.session.user.LastName} (${req.session.user.Email})</p>
                <p><strong>Subject:</strong> ${Subject || '(No Subject)'}</p>
                <hr>
                <p>${MessageBody.replace(/\n/g, '<br>')}</p>
                <hr>
                <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/messages">View message on LegacyKeeper</a></p>
              `
            });
          } catch (emailError) {
            console.error('Error sending email notification:', emailError);
            // Don't fail the message send if email fails
          }
        }

        successCount++;
      } catch (error) {
        console.error(`Error sending message to ${recipientId}:`, error);
        failCount++;
      }
    }

    // Show appropriate success message
    if (successCount > 0) {
      if (recipientIds.length > 1) {
        req.flash('success_msg', `Message sent successfully to ${successCount} recipient(s)` +
          (failCount > 0 ? `. ${failCount} failed.` : ''));
      } else {
        req.flash('success_msg', 'Message sent successfully');
      }
    } else {
      req.flash('error_msg', 'Failed to send message to any recipients');
    }

    res.redirect('/messages');
  } catch (error) {
    console.error('Error sending message:', error);
    req.flash('error_msg', 'Error sending message');
    res.redirect('/messages/compose');
  }
});

// Bulk email to all contacts - show compose with contacts and groups
// IMPORTANT: This route must come BEFORE /:id to avoid conflicts
router.get('/bulk-email', async (req, res) => {
  try {
    // Get user's contacts
    const allContacts = await db.findAll('contacts.json');
    const userContacts = allContacts.filter(c => c.OwnerUser === req.session.user.UniqueId);

    // Get user's contact groups
    const allGroups = await db.findAll('contact_groups.json');
    const userGroups = allGroups.filter(g => g.OwnerUser === req.session.user.UniqueId);

    if (userContacts.length === 0 && userGroups.length === 0) {
      req.flash('error_msg', 'No contacts or contact groups available to send messages to');
      return res.redirect('/messages');
    }

    // Render compose view with bulkEmail flag
    res.render('messages/bulk-email-compose', {
      contacts: userContacts,
      contactGroups: userGroups
    });
  } catch (error) {
    console.error('Error loading bulk email form:', error);
    req.flash('error_msg', 'Error loading bulk email form');
    res.redirect('/messages');
  }
});

// View message
router.get('/:id', async (req, res) => {
  const message = await db.findById('messages.json', req.params.id);

  if (!message) {
    req.flash('error_msg', 'Message not found');
    return res.redirect('/messages');
  }

  // Check if user is sender or recipient
  if (message.FromUserId !== req.session.user.UniqueId &&
      message.ToUserId !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Access denied');
    return res.redirect('/messages');
  }

  // Mark as read if recipient is viewing
  if (message.ToUserId === req.session.user.UniqueId && !message.IsRead) {
    db.update('messages.json', req.params.id, {
      IsRead: true,
      ReadAt: new Date().toISOString()
    });
    message.IsRead = true;
    message.ReadAt = new Date().toISOString();
  }

  // Get sender and recipient info
  const sender = await db.findById('users.json', message.FromUserId);
  const recipient = await db.findById('users.json', message.ToUserId);

  res.render('messages/view', { message, sender, recipient });
});

// Reply to message
router.get('/:id/reply', async (req, res) => {
  const message = await db.findById('messages.json', req.params.id);

  if (!message) {
    req.flash('error_msg', 'Message not found');
    return res.redirect('/messages');
  }

  // Check if user is sender or recipient
  if (message.FromUserId !== req.session.user.UniqueId &&
      message.ToUserId !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Access denied');
    return res.redirect('/messages');
  }

  const users = await getAllUsers(req.session.user.UniqueId);
  const replyTo = message.FromUserId === req.session.user.UniqueId
    ? message.ToUserId
    : message.FromUserId;

  res.render('messages/compose', {
    users,
    recipientId: replyTo,
    replyToMessage: message
  });
});

// Delete message
router.delete('/:id', async (req, res) => {
  const message = await db.findById('messages.json', req.params.id);

  if (!message) {
    req.flash('error_msg', 'Message not found');
    return res.redirect('/messages');
  }

  // Only recipient can delete
  if (message.ToUserId !== req.session.user.UniqueId) {
    req.flash('error_msg', 'Access denied');
    return res.redirect('/messages');
  }

  db.delete('messages.json', req.params.id);
  req.flash('success_msg', 'Message deleted successfully');
  res.redirect('/messages');
});

// Send bulk email to all contacts
router.post('/bulk-email/send', async (req, res) => {
  const { Subject, MessageBody, SendEmail, SelectedContacts, SelectedGroups } = req.body;

  if (!MessageBody || MessageBody.trim() === '') {
    req.flash('error_msg', 'Message body is required');
    return res.redirect('/messages/bulk-email');
  }

  try {
    // Get all contacts for this user
    const allContacts = await db.findAll('contacts.json');
    const userContacts = allContacts.filter(c => c.OwnerUser === req.session.user.UniqueId);

    console.log('=== BULK EMAIL DEBUG ===');
    console.log('Total contacts in DB:', allContacts.length);
    console.log('User contacts:', userContacts.length);
    console.log('SelectedContacts:', SelectedContacts);
    console.log('SelectedGroups:', SelectedGroups);

    // Collect all recipient contacts
    let recipientContacts = [];

    // Handle selected contacts
    if (SelectedContacts) {
      const selectedIds = Array.isArray(SelectedContacts) ? SelectedContacts : [SelectedContacts];
      const contactsFromSelection = userContacts.filter(c =>
        selectedIds.includes(c.UniqueId) && c.Email && c.Email.trim() !== ''
      );
      recipientContacts.push(...contactsFromSelection);
      console.log('Added selected contacts:', contactsFromSelection.length);
    }

    // Handle selected contact groups
    if (SelectedGroups) {
      const selectedGroupIds = Array.isArray(SelectedGroups) ? SelectedGroups : [SelectedGroups];
      const allGroups = await db.findAll('contact_groups.json');

      for (const groupId of selectedGroupIds) {
        const group = allGroups.find(g => g.UniqueId === groupId);
        if (group && group.Members) {
          // Get contacts from group
          const groupContacts = userContacts.filter(c =>
            group.Members.includes(c.UniqueId) && c.Email && c.Email.trim() !== ''
          );
          recipientContacts.push(...groupContacts);
          console.log(`Added contacts from group ${group.GroupName}:`, groupContacts.length);
        }
      }
    }

    // Remove duplicates based on email
    const uniqueEmails = new Set();
    recipientContacts = recipientContacts.filter(c => {
      if (uniqueEmails.has(c.Email)) {
        return false;
      }
      uniqueEmails.add(c.Email);
      return true;
    });

    console.log('Total unique recipients:', recipientContacts.length);

    if (recipientContacts.length === 0) {
      req.flash('error_msg', 'No contacts with email addresses found');
      return res.redirect('/messages/bulk-email');
    }

    let successCount = 0;
    let failCount = 0;

    // Send to each contact
    for (const contact of recipientContacts) {
      try {
        // Check if contact has associated user account
        let recipientUserId = contact.AssociatedUserAcco;

        // If contact has user account, create internal message
        if (recipientUserId && recipientUserId.trim() !== '') {
          await db.create('messages.json', {
            FromUserId: req.session.user.UniqueId,
            ToUserId: recipientUserId,
            Subject: Subject || '(No Subject)',
            MessageBody: MessageBody,
            MessageType: 'email',
            IsRead: false,
            ReadAt: '',
            SentAt: new Date().toISOString(),
            ParentMessageId: '',
            ThreadId: '',
            Attachments: []
          });
        }

        // If SendEmail is checked and email is configured, send actual email
        if (SendEmail === 'on' && process.env.EMAIL_ENABLED === 'true' && contact.Email) {
          try {
            const transporter = nodemailer.createTransport({
              host: process.env.EMAIL_HOST,
              port: process.env.EMAIL_PORT,
              secure: process.env.EMAIL_SECURE === 'true',
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
              }
            });

            await transporter.sendMail({
              from: process.env.EMAIL_FROM || '"LegacyKeeper" <noreply@legacykeeper.com>',
              to: contact.Email,
              subject: `Message from ${req.session.user.FirstName} ${req.session.user.LastName}: ${Subject || '(No Subject)'}`,
              html: `
                <h2>You have received a message from LegacyKeeper</h2>
                <p><strong>From:</strong> ${req.session.user.FirstName} ${req.session.user.LastName} (${req.session.user.Email})</p>
                <p><strong>To:</strong> ${contact.FirstName} ${contact.LastName}</p>
                <p><strong>Subject:</strong> ${Subject || '(No Subject)'}</p>
                <hr>
                <p>${MessageBody.replace(/\n/g, '<br>')}</p>
                <hr>
                <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/messages">View on LegacyKeeper</a></p>
              `
            });
          } catch (emailError) {
            console.error(`Error sending email to ${contact.Email}:`, emailError);
            // Don't fail the whole process if one email fails
          }
        }

        successCount++;
      } catch (error) {
        console.error(`Error sending message to contact ${contact.FirstName} ${contact.LastName}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      req.flash('success_msg', `Bulk email sent successfully to ${successCount} contact(s)` +
        (failCount > 0 ? `. ${failCount} failed.` : ''));
    } else {
      req.flash('error_msg', 'Failed to send bulk email to any contacts');
    }

    res.redirect('/messages');
  } catch (error) {
    console.error('Error sending bulk email:', error);
    req.flash('error_msg', 'Error sending bulk email');
    res.redirect('/messages/bulk-email');
  }
});

module.exports = router;

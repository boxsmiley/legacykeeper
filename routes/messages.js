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
    const recipient = await db.findById('users.json', ToUserId);
    if (!recipient) {
      req.flash('error_msg', 'Recipient not found');
      return res.redirect('/messages/compose');
    }

    // Create message in database
    const message = await db.create('messages.json', {
      FromUserId: req.session.user.UniqueId,
      ToUserId: ToUserId,
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

    req.flash('success_msg', 'Message sent successfully');
    res.redirect('/messages');
  } catch (error) {
    console.error('Error sending message:', error);
    req.flash('error_msg', 'Error sending message');
    res.redirect('/messages/compose');
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

module.exports = router;

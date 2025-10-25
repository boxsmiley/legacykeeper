const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

// Get or create conversation between two users
async function getOrCreateConversation(userId1, userId2) {
  const conversations = await db.findAll('conversations.json');

  // Find existing conversation
  const existingConv = conversations.find(conv =>
    conv.Participants.includes(userId1) && conv.Participants.includes(userId2)
  );

  if (existingConv) {
    return existingConv;
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

  return newConv;
}

// Chat list - show all conversations
router.get('/', async (req, res) => {
  const conversations = await db.findAll('conversations.json');

  // Filter conversations where current user is a participant
  const userConversations = conversations.filter(conv =>
    conv.Participants.includes(req.session.user.UniqueId)
  );

  // Sort by last message time
  userConversations.sort((a, b) =>
    new Date(b.LastMessageAt) - new Date(a.LastMessageAt)
  );

  // Get user details for each conversation
  const allUsers = await db.findAll('users.json');
  const userMap = {};
  allUsers.forEach(u => {
    userMap[u.UniqueId] = u;
  });

  // Calculate total unread count
  let totalUnread = 0;
  userConversations.forEach(conv => {
    totalUnread += conv.UnreadCount[req.session.user.UniqueId] || 0;
  });

  res.render('chat/index', {
    conversations: userConversations,
    userMap,
    totalUnread
  });
});

// Start new chat
router.get('/new', async (req, res) => {
  const allUsers = await db.findAll('users.json');
  const users = allUsers.filter(u =>
    u.UniqueId !== req.session.user.UniqueId && u.AccountStatus === 'active'
  );

  res.render('chat/new', { users });
});

// Create or open chat with specific user
router.post('/start', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    req.flash('error_msg', 'Please select a user');
    return res.redirect('/chat/new');
  }

  const otherUser = await db.findById('users.json', userId);
  if (!otherUser) {
    req.flash('error_msg', 'User not found');
    return res.redirect('/chat/new');
  }

  const conversation = await getOrCreateConversation(req.session.user.UniqueId, userId);
  res.redirect(`/chat/${conversation.UniqueId}`);
});

// View specific conversation
router.get('/:conversationId', async (req, res) => {
  const conversation = await db.findById('conversations.json', req.params.conversationId);

  if (!conversation) {
    req.flash('error_msg', 'Conversation not found');
    return res.redirect('/chat');
  }

  // Check if user is a participant
  if (!conversation.Participants.includes(req.session.user.UniqueId)) {
    req.flash('error_msg', 'Access denied');
    return res.redirect('/chat');
  }

  // Get other user in conversation
  const otherUserId = conversation.Participants.find(id => id !== req.session.user.UniqueId);
  const otherUser = await db.findById('users.json', otherUserId);

  if (!otherUser) {
    req.flash('error_msg', 'User not found');
    return res.redirect('/chat');
  }

  // Get all messages in conversation
  const allChatMessages = await db.findAll('chat_messages.json');
  const messages = allChatMessages.filter(m => m.ConversationId === req.params.conversationId);

  // Sort by creation date
  messages.sort((a, b) => new Date(a.CreatedDate) - new Date(b.CreatedDate));

  // Mark messages as read
  messages.forEach(message => {
    if (message.ToUserId === req.session.user.UniqueId && !message.IsRead) {
      db.update('chat_messages.json', message.UniqueId, {
        IsRead: true,
        ReadAt: new Date().toISOString()
      });
    }
  });

  // Reset unread count for this user
  const unreadCount = conversation.UnreadCount || {};
  unreadCount[req.session.user.UniqueId] = 0;
  db.update('conversations.json', conversation.UniqueId, {
    UnreadCount: unreadCount
  });

  res.render('chat/conversation', {
    conversation,
    otherUser,
    messages
  });
});

// Send chat message (API endpoint for AJAX)
router.post('/:conversationId/send', async (req, res) => {
  const { messageText } = req.body;

  if (!messageText || messageText.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const conversation = await db.findById('conversations.json', req.params.conversationId);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  // Check if user is a participant
  if (!conversation.Participants.includes(req.session.user.UniqueId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Get other user
  const otherUserId = conversation.Participants.find(id => id !== req.session.user.UniqueId);

  try {
    // Create chat message
    const message = await db.create('chat_messages.json', {
      ConversationId: req.params.conversationId,
      FromUserId: req.session.user.UniqueId,
      ToUserId: otherUserId,
      MessageText: messageText.trim(),
      IsRead: false,
      ReadAt: '',
      SentAt: new Date().toISOString(),
      MessageType: 'text',
      Attachments: []
    });

    // Update conversation
    const unreadCount = conversation.UnreadCount || {};
    unreadCount[otherUserId] = (unreadCount[otherUserId] || 0) + 1;

    db.update('conversations.json', conversation.UniqueId, {
      LastMessageAt: new Date().toISOString(),
      LastMessageText: messageText.trim().substring(0, 100),
      UnreadCount: unreadCount
    });

    res.json({
      success: true,
      message: {
        UniqueId: message.UniqueId,
        MessageText: message.MessageText,
        SentAt: message.SentAt,
        FromUserId: message.FromUserId,
        sender: {
          FirstName: req.session.user.FirstName,
          LastName: req.session.user.LastName,
          ProfilePicture: req.session.user.ProfilePicture
        }
      }
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
});

// Get new messages (API endpoint for polling/real-time updates)
router.get('/:conversationId/messages', async (req, res) => {
  const { since } = req.query; // ISO timestamp

  const conversation = await db.findById('conversations.json', req.params.conversationId);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  // Check if user is a participant
  if (!conversation.Participants.includes(req.session.user.UniqueId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Get messages
  const allChatMessages = await db.findAll('chat_messages.json');
  let messages = allChatMessages.filter(m => m.ConversationId === req.params.conversationId);

  // Filter messages since timestamp if provided
  if (since) {
    messages = messages.filter(m => new Date(m.CreatedDate) > new Date(since));
  }

  // Get sender info
  const allUsers = await db.findAll('users.json');
  const userMap = {};
  allUsers.forEach(u => {
    userMap[u.UniqueId] = {
      FirstName: u.FirstName,
      LastName: u.LastName,
      ProfilePicture: u.ProfilePicture
    };
  });

  // Add sender info to messages
  const messagesWithSender = messages.map(m => ({
    ...m,
    sender: userMap[m.FromUserId]
  }));

  res.json({ messages: messagesWithSender });
});

// Delete conversation
router.delete('/:conversationId', async (req, res) => {
  const conversation = await db.findById('conversations.json', req.params.conversationId);

  if (!conversation) {
    req.flash('error_msg', 'Conversation not found');
    return res.redirect('/chat');
  }

  // Check if user is a participant
  if (!conversation.Participants.includes(req.session.user.UniqueId)) {
    req.flash('error_msg', 'Access denied');
    return res.redirect('/chat');
  }

  // Delete all messages in conversation
  const allChatMessages = await db.findAll('chat_messages.json');
  allChatMessages.forEach(message => {
    if (message.ConversationId === req.params.conversationId) {
      db.delete('chat_messages.json', message.UniqueId);
    }
  });

  // Delete conversation
  db.delete('conversations.json', req.params.conversationId);

  req.flash('success_msg', 'Conversation deleted successfully');
  res.redirect('/chat');
});

module.exports = router;

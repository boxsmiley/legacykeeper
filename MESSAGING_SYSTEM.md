# LegacyKeeper Messaging System

A comprehensive internal messaging and chat system for communication between LegacyKeeper users.

## Features

### 📧 Email-Style Messages
- **Compose Messages**: Send structured messages with subject lines to other users
- **Inbox Management**: View received and sent messages in organized tabs
- **Message Threading**: Reply to messages and maintain conversation context
- **Read Status**: Track which messages have been read with timestamps
- **Email Notifications**: Optional email notifications for new messages (requires SMTP configuration)
- **Message Actions**: Reply, delete, and start chats from messages

### 💬 Real-Time Chat
- **Live Conversations**: Instant messaging with automatic message polling
- **Conversation List**: View all active conversations with unread counts
- **Message History**: Full conversation history with timestamps
- **User Presence**: See conversation participants with avatars
- **Auto-Scroll**: Automatic scrolling to latest messages
- **Typing Support**: Visual indicators and smooth UX
- **Quick Actions**: Delete conversations, send emails directly from chat

## Architecture

### Database Schema

#### Messages (messages.json)
```json
{
  "UniqueId": "unique-message-id",
  "FromUserId": "sender-user-id",
  "ToUserId": "recipient-user-id",
  "Subject": "Message subject",
  "MessageBody": "Message content",
  "MessageType": "email",
  "IsRead": false,
  "ReadAt": "2025-10-24T12:00:00.000Z",
  "SentAt": "2025-10-24T12:00:00.000Z",
  "ParentMessageId": "parent-message-id",
  "ThreadId": "thread-id",
  "Attachments": []
}
```

#### Chat Messages (chat_messages.json)
```json
{
  "UniqueId": "unique-message-id",
  "ConversationId": "conversation-id",
  "FromUserId": "sender-user-id",
  "ToUserId": "recipient-user-id",
  "MessageText": "Chat message text",
  "IsRead": false,
  "ReadAt": "2025-10-24T12:00:00.000Z",
  "SentAt": "2025-10-24T12:00:00.000Z",
  "MessageType": "text",
  "Attachments": []
}
```

#### Conversations (conversations.json)
```json
{
  "UniqueId": "unique-conversation-id",
  "Participants": ["user-id-1", "user-id-2"],
  "LastMessageAt": "2025-10-24T12:00:00.000Z",
  "LastMessageText": "Preview of last message",
  "UnreadCount": {
    "user-id-1": 5,
    "user-id-2": 0
  },
  "IsActive": true
}
```

### Routes

#### Message Routes (`/messages`)
- `GET /messages` - View inbox (received and sent messages)
- `GET /messages/compose` - Compose new message form
- `POST /messages/send` - Send a new message
- `GET /messages/:id` - View specific message
- `GET /messages/:id/reply` - Reply to message
- `DELETE /messages/:id` - Delete message

#### Chat Routes (`/chat`)
- `GET /chat` - List all conversations
- `GET /chat/new` - Start new chat form
- `POST /chat/start` - Create or open conversation
- `GET /chat/:conversationId` - View conversation
- `POST /chat/:conversationId/send` - Send chat message (AJAX)
- `GET /chat/:conversationId/messages` - Poll for new messages (AJAX)
- `DELETE /chat/:conversationId` - Delete conversation

## Usage Guide

### Sending Messages

1. **Via Navigation**: Click "Messages" in the navbar
2. **Compose**: Click "Compose Message" button
3. **Fill Form**:
   - Select recipient from dropdown
   - Enter subject line
   - Type message body
   - Optionally enable email notification
4. **Send**: Click "Send Message"

### Starting a Chat

1. **Via Navigation**: Click "Chat" in the navbar
2. **Start Chat**: Click "Start New Chat" button
3. **Select User**: Choose user from dropdown
4. **Start Chatting**: Begin real-time conversation

### From Contacts

You can start messaging directly from:
- Contact profiles (future feature)
- User search (future feature)
- Message replies

## Email Notifications

### Configuration

To enable email notifications, configure SMTP settings in `.env`:

```env
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM="LegacyKeeper" <noreply@legacykeeper.com>
```

### Gmail Setup

1. Enable 2-Factor Authentication in your Google Account
2. Generate App Password:
   - Go to Google Account Settings → Security
   - Select "App passwords"
   - Generate password for "Mail"
   - Use this password in `EMAIL_PASSWORD`

### Other Email Providers

- **Outlook/Hotmail**:
  ```env
  EMAIL_HOST=smtp-mail.outlook.com
  EMAIL_PORT=587
  ```

- **SendGrid**:
  ```env
  EMAIL_HOST=smtp.sendgrid.net
  EMAIL_PORT=587
  EMAIL_USER=apikey
  EMAIL_PASSWORD=your_sendgrid_api_key
  ```

- **AWS SES**:
  ```env
  EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
  EMAIL_PORT=587
  EMAIL_USER=your_smtp_username
  EMAIL_PASSWORD=your_smtp_password
  ```

## Real-Time Updates

### Current Implementation: Polling

The chat system uses **polling** to fetch new messages every 3 seconds:

```javascript
// Polls for new messages since last update
setInterval(pollForNewMessages, 3000);
```

**Advantages**:
- Simple to implement
- Works without additional dependencies
- No WebSocket server needed
- Compatible with all browsers

**Disadvantages**:
- Not truly real-time (3-second delay)
- More server requests
- Higher bandwidth usage

### Future: WebSocket Integration

For true real-time messaging, Socket.IO can be integrated:

```javascript
// Install Socket.IO (already installed)
npm install socket.io

// Server-side (server.js)
const http = require('http');
const socketio = require('socket.io');
const server = http.createServer(app);
const io = socketio(server);

io.on('connection', (socket) => {
  socket.on('join-conversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('send-message', (data) => {
    io.to(data.conversationId).emit('new-message', data.message);
  });
});

// Client-side (conversation.ejs)
const socket = io();
socket.emit('join-conversation', conversationId);
socket.on('new-message', (message) => {
  addMessageToUI(message, false);
});
```

## Security Considerations

### Access Control
- ✅ Users can only message other active users
- ✅ Users can only view their own messages and conversations
- ✅ Users can only delete their own received messages
- ✅ Conversation participants are validated on every request

### Input Validation
- ✅ Message content is required and validated
- ✅ Recipient must exist and be active
- ✅ HTML is escaped in chat to prevent XSS
- ⚠️ **Future**: Implement rate limiting for message sending
- ⚠️ **Future**: Add message length limits
- ⚠️ **Future**: Implement spam detection

### Data Privacy
- Messages are stored in JSON files (consider encryption for production)
- Only conversation participants can access messages
- Deleted messages are permanently removed

## UI Components

### Navigation
- Messages and Chat links in main navbar
- Unread count badges on Messages page
- Unread indicators in conversation list

### Messages Interface
- **Inbox View**: Tabbed interface (Received/Sent)
- **Message Item**: From/To, Subject, Preview, Date, Read status
- **Message View**: Full message with reply/delete actions
- **Compose Form**: Recipient selector, subject, body, email option

### Chat Interface
- **Conversation List**: User avatars, last message, unread counts
- **Chat Window**: Fixed height with scrollable message area
- **Message Bubbles**: Different styles for sent/received messages
- **Input Area**: Auto-expanding textarea, send button

## Performance Optimization

### Current
- Messages loaded per page view
- Chat polling every 3 seconds
- Minimal database queries with filtering

### Recommended for Scale
1. **Pagination**: Limit messages per page
2. **Lazy Loading**: Load older messages on scroll
3. **Caching**: Cache conversation lists
4. **WebSockets**: Replace polling with real-time updates
5. **Database**: Migrate from JSON to proper database (PostgreSQL, MongoDB)
6. **Search**: Implement message search with indexing
7. **Attachments**: Add file upload support

## Integration Points

### Contacts
- Send message directly from contact profile
- Filter recipients by contact groups

### Documents
- Share document links in messages
- Attach documents to messages (future)

### Notifications
- Desktop notifications for new messages (future)
- Push notifications (future)
- Email digests (future)

## API Endpoints

### Message API
```
GET    /messages              - List inbox
GET    /messages/compose      - Compose form
POST   /messages/send         - Send message
GET    /messages/:id          - View message
GET    /messages/:id/reply    - Reply form
DELETE /messages/:id          - Delete message
```

### Chat API
```
GET    /chat                       - List conversations
GET    /chat/new                   - New chat form
POST   /chat/start                 - Start conversation
GET    /chat/:id                   - View conversation
POST   /chat/:id/send              - Send message (JSON)
GET    /chat/:id/messages?since=   - Get new messages (JSON)
DELETE /chat/:id                   - Delete conversation
```

## Testing

### Manual Testing Checklist

#### Messages
- [ ] Send message to another user
- [ ] Receive and read message
- [ ] Reply to message
- [ ] Delete message
- [ ] Test email notification (if enabled)
- [ ] Check read status updates
- [ ] Verify sent messages appear in Sent tab

#### Chat
- [ ] Start new chat with user
- [ ] Send chat messages
- [ ] Receive chat messages (test polling)
- [ ] View conversation list
- [ ] Check unread counts
- [ ] Delete conversation
- [ ] Test multiple concurrent chats
- [ ] Test message auto-scroll

#### Security
- [ ] Try accessing other user's messages (should fail)
- [ ] Try sending to non-existent user (should fail)
- [ ] Test XSS prevention in chat
- [ ] Verify only active users are selectable

### Automated Testing
```javascript
// Example test (future implementation)
describe('Messaging System', () => {
  it('should send a message', async () => {
    // Test implementation
  });

  it('should mark message as read', async () => {
    // Test implementation
  });

  it('should prevent unauthorized access', async () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Messages not sending
- **Check**: User exists and is active
- **Check**: Required fields (ToUserId, MessageBody) are filled
- **Check**: Browser console for JavaScript errors

### Chat messages not appearing
- **Check**: Polling is running (check browser console)
- **Check**: Conversation ID is correct
- **Check**: User is participant in conversation
- **Try**: Refresh the page

### Email notifications not working
- **Check**: `EMAIL_ENABLED=true` in `.env`
- **Check**: SMTP credentials are correct
- **Check**: Sender email is allowed by SMTP provider
- **Check**: Recipient email is valid
- **Review**: Server console for nodemailer errors

### Unread counts incorrect
- **Cause**: Messages marked as read incorrectly
- **Fix**: Check message read logic in routes
- **Workaround**: Delete and recreate conversation

## Future Enhancements

### Phase 1 (Immediate)
- [ ] Message search functionality
- [ ] Message attachments (files, images)
- [ ] Group messaging
- [ ] Message pagination

### Phase 2 (Near-term)
- [ ] WebSocket real-time updates
- [ ] Typing indicators (real-time)
- [ ] Online/offline status
- [ ] Desktop notifications

### Phase 3 (Long-term)
- [ ] Video/voice calls
- [ ] Message reactions (emoji)
- [ ] Message formatting (bold, italic, links)
- [ ] Message scheduling
- [ ] Auto-replies/out-of-office
- [ ] Message templates
- [ ] Analytics and insights

## Support

For issues or questions:
1. Check this documentation
2. Review server console logs
3. Check browser console for client-side errors
4. Verify database JSON files are valid
5. Test with different users

## Summary

The LegacyKeeper messaging system provides both formal email-style messaging and casual real-time chat, giving users flexibility in how they communicate. The system is built with security, scalability, and user experience in mind, with clear paths for future enhancements.
o


ombp gfao ufpe fdzd

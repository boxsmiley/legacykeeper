const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../models/database');
const nodemailer = require('nodemailer');

// Create email transporter (configure with your email service)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify death report link (public route - no auth required)
router.get('/report-death/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find executor notification by token
    const allNotifications = await db.findAll('executor_notifications.json');
    const notification = allNotifications.find(n => n.Token === token);

    if (!notification) {
      return res.status(404).render('error', {
        message: 'Invalid or expired notification link',
        error: { status: 404 }
      });
    }

    // Check if already used
    if (notification.Status === 'confirmed') {
      return res.render('executorNotifications/already-reported', {
        notification,
        userName: notification.DeceasedUserName
      });
    }

    // Get user details
    const user = await db.findById('users.json', notification.UserId);
    if (!user) {
      return res.status(404).render('error', {
        message: 'User not found',
        error: { status: 404 }
      });
    }

    res.render('executorNotifications/confirm-death', {
      notification,
      user,
      token
    });
  } catch (error) {
    console.error('Error loading death report page:', error);
    res.status(500).render('error', {
      message: 'Error loading page',
      error: { status: 500 }
    });
  }
});

// Confirm death report (public route - no auth required)
router.post('/report-death/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { confirmedName, additionalInfo } = req.body;

    // Find executor notification
    const allNotifications = await db.findAll('executor_notifications.json');
    const notification = allNotifications.find(n => n.Token === token);

    if (!notification) {
      req.flash('error_msg', 'Invalid or expired notification link');
      return res.redirect('/');
    }

    if (notification.Status === 'confirmed') {
      req.flash('error_msg', 'This death has already been reported');
      return res.redirect('/');
    }

    // Update notification status
    await db.update('executor_notifications.json', notification.UniqueId, {
      Status: 'confirmed',
      ConfirmedAt: new Date().toISOString(),
      ConfirmedName: confirmedName,
      AdditionalInfo: additionalInfo || ''
    });

    // Update user status to deceased
    await db.update('users.json', notification.UserId, {
      AccountStatus: 'deceased',
      DeceasedAt: new Date().toISOString(),
      DeceasedReportedBy: confirmedName
    });

    // Get all connections for this user
    const allConnections = await db.findAll('connections.json');
    const userConnections = allConnections.filter(c =>
      c.OwnerUser === notification.UserId && c.ConnectionStatus === 'active'
    );

    // Send notifications to all connections
    const notificationResults = await sendDeathNotifications(
      notification.UserId,
      notification.DeceasedUserName,
      userConnections,
      confirmedName
    );

    // Create audit log
    await db.create('audit_logs.json', {
      UserId: notification.UserId,
      Action: 'death_reported',
      EntityType: 'user',
      EntityId: notification.UserId,
      Details: `Death reported by executor: ${confirmedName}`,
      IPAddress: req.ip,
      UserAgent: req.get('user-agent')
    });

    res.render('executorNotifications/death-confirmed', {
      userName: notification.DeceasedUserName,
      executorName: notification.ExecutorName,
      notificationsSent: notificationResults.sent,
      notificationsFailed: notificationResults.failed
    });
  } catch (error) {
    console.error('Error confirming death report:', error);
    req.flash('error_msg', 'Error processing death report');
    res.redirect('/');
  }
});

// Send death notifications to all connections
async function sendDeathNotifications(userId, deceasedName, connections, reportedBy) {
  const results = { sent: 0, failed: 0 };

  // Get all users, contacts, and groups
  const allUsers = await db.findAll('users.json');
  const allContacts = await db.findAll('contacts.json');
  const allGroups = await db.findAll('contact_groups.json');

  for (const connection of connections) {
    try {
      let recipientEmails = [];
      let recipientNames = [];

      if (connection.ConnectionType === 'user') {
        const user = allUsers.find(u => u.UniqueId === connection.ConnectedEntityId);
        if (user && user.Email) {
          recipientEmails.push(user.Email);
          recipientNames.push(`${user.FirstName} ${user.LastName}`);
        }
      } else if (connection.ConnectionType === 'contact') {
        const contact = allContacts.find(c => c.UniqueId === connection.ConnectedEntityId);
        if (contact && contact.Email) {
          recipientEmails.push(contact.Email);
          recipientNames.push(`${contact.FirstName} ${contact.LastName}`);
        }
      } else if (connection.ConnectionType === 'contact_group') {
        const group = allGroups.find(g => g.UniqueId === connection.ConnectedEntityId);
        if (group && group.Members) {
          for (const memberId of group.Members) {
            const contact = allContacts.find(c => c.UniqueId === memberId);
            if (contact && contact.Email) {
              recipientEmails.push(contact.Email);
              recipientNames.push(`${contact.FirstName} ${contact.LastName}`);
            }
          }
        }
      }

      // Send email to each recipient
      for (let i = 0; i < recipientEmails.length; i++) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@legacykeeper.com',
            to: recipientEmails[i],
            subject: `LegacyKeeper: Notification Regarding ${deceasedName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">LegacyKeeper Notification</h2>
                <p>Dear ${recipientNames[i]},</p>
                <p>We are writing to inform you that ${deceasedName} has passed away. This notification was reported by their designated executor, ${reportedBy}.</p>
                <p>${deceasedName} had designated you as a connection in their LegacyKeeper account. According to their wishes, we are notifying you of their passing.</p>
                <p>If you have a LegacyKeeper account and were granted access permissions, you may now be able to view documents and information that ${deceasedName} chose to share with you.</p>
                <p>Please visit <a href="${process.env.BASE_URL || 'http://localhost:3000'}">LegacyKeeper</a> to access any shared information.</p>
                <p>Our sincere condolences during this difficult time.</p>
                <p style="margin-top: 30px; color: #666; font-size: 12px;">
                  This is an automated message from LegacyKeeper. Please do not reply to this email.
                </p>
              </div>
            `
          });
          results.sent++;
        } catch (emailError) {
          console.error(`Failed to send email to ${recipientEmails[i]}:`, emailError);
          results.failed++;
        }
      }
    } catch (error) {
      console.error('Error processing connection notification:', error);
      results.failed++;
    }
  }

  return results;
}

// Send executor notification email (called when executor connection is created/updated)
async function sendExecutorNotificationEmail(userId, userName, executorEmail, executorName, connectionId) {
  try {
    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create executor notification record
    await db.create('executor_notifications.json', {
      UserId: userId,
      DeceasedUserName: userName,
      ExecutorEmail: executorEmail,
      ExecutorName: executorName,
      ConnectionId: connectionId,
      Token: token,
      Status: 'pending',
      SentAt: new Date().toISOString()
    });

    // Send email
    const reportLink = `${process.env.BASE_URL || 'http://localhost:3000'}/executor-notifications/report-death/${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@legacykeeper.com',
      to: executorEmail,
      subject: `You have been designated as an Executor for ${userName} on LegacyKeeper`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a90e2;">LegacyKeeper Executor Designation</h2>
          <p>Dear ${executorName},</p>
          <p><strong>${userName}</strong> has designated you as an executor in their LegacyKeeper account.</p>
          <p>As an executor, you have an important responsibility. Should ${userName} pass away, you will need to notify LegacyKeeper so that their wishes regarding their digital legacy can be carried out.</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your Executor Link</h3>
            <p>Please save this link in a secure location:</p>
            <a href="${reportLink}" style="display: inline-block; padding: 12px 24px; background: #4a90e2; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Report Death of ${userName}</a>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">Or copy this URL: ${reportLink}</p>
          </div>

          <p><strong>Important:</strong> This link should only be used when ${userName} has passed away and you need to notify their connections according to their wishes.</p>

          <p>When you use this link, LegacyKeeper will:</p>
          <ul>
            <li>Update ${userName}'s account status</li>
            <li>Notify all of their designated connections</li>
            <li>Enable access to documents and information they chose to share posthumously</li>
          </ul>

          <p>If you have any questions about your role as an executor, please contact LegacyKeeper support.</p>

          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            This is an automated message from LegacyKeeper. Please keep this email for your records.
          </p>
        </div>
      `
    });

    return { success: true, token };
  } catch (error) {
    console.error('Error sending executor notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  router,
  sendExecutorNotificationEmail
};

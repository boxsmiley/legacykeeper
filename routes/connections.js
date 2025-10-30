const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { ensureAuthenticated } = require('../middleware/auth');
const { sendExecutorNotificationEmail } = require('./executorNotifications');

router.use(ensureAuthenticated);

// View all connections
router.get('/', async (req, res) => {
  try {
    // Get user's connections
    const allConnections = await db.findAll('connections.json');
    const userConnections = allConnections.filter(c => c.OwnerUser === req.session.user.UniqueId);

    // Get all users and contact groups for reference
    const allUsers = await db.findAll('users.json');
    const allContactGroups = await db.findAll('contact_groups.json');

    // Organize connections by type
    const userConnections_data = [];
    const contactConnections_data = [];
    const groupConnections_data = [];

    userConnections.forEach(conn => {
      if (conn.ConnectionType === 'user') {
        const user = allUsers.find(u => u.UniqueId === conn.ConnectedEntityId);
        if (user) {
          userConnections_data.push({
            connection: conn,
            data: user
          });
        }
      } else if (conn.ConnectionType === 'contact') {
        // Contact data is now embedded in the connection
        if (conn.ContactDetails) {
          // Transform ContactDetails to contact format for view compatibility
          const contactData = {
            UniqueId: conn.ConnectedEntityId,
            FirstName: conn.ContactDetails.FirstName || '',
            LastName: conn.ContactDetails.LastName || '',
            Email: conn.ContactDetails.Email || '',
            PhoneNumber: conn.ContactDetails.PhoneNumber || '',
            Address: conn.ContactDetails.Address || '',
            Relationship: conn.RelationshipType,
            Notes: conn.Notes,
            AssociatedUserAccount: conn.ContactDetails.AssociatedUserAccount || ''
          };
          contactConnections_data.push({
            connection: conn,
            data: contactData
          });
        }
      } else if (conn.ConnectionType === 'contact_group') {
        const group = allContactGroups.find(g => g.UniqueId === conn.ConnectedEntityId);
        if (group) {
          groupConnections_data.push({
            connection: conn,
            data: group
          });
        }
      }
    });

    res.render('connections/index', {
      userConnections: userConnections_data,
      contactConnections: contactConnections_data,
      groupConnections: groupConnections_data
    });
  } catch (error) {
    console.error('Error loading connections:', error);
    req.flash('error_msg', 'Error loading connections');
    res.redirect('/dashboard');
  }
});

// Add connection page
router.get('/add', async (req, res) => {
  try {
    // Get all available users (excluding current user and already connected)
    const allUsers = await db.findAll('users.json');
    const availableUsers = allUsers.filter(u =>
      u.UniqueId !== req.session.user.UniqueId &&
      u.AccountStatus === 'active'
    );

    // Get user's contacts
    const allContacts = await db.findAll('contacts.json');
    const userContacts = allContacts.filter(c => c.OwnerUser === req.session.user.UniqueId);

    // Get user's contact groups
    const allContactGroups = await db.findAll('contact_groups.json');
    const userContactGroups = allContactGroups.filter(g => g.OwnerUser === req.session.user.UniqueId);

    // Get existing connections to filter out
    const existingConnections = await db.findAll('connections.json');
    const userConnectionIds = existingConnections
      .filter(c => c.OwnerUser === req.session.user.UniqueId)
      .map(c => c.ConnectedEntityId);

    // Filter out already connected entities
    const filteredUsers = availableUsers.filter(u => !userConnectionIds.includes(u.UniqueId));
    const filteredContacts = userContacts.filter(c => !userConnectionIds.includes(c.UniqueId));
    const filteredGroups = userContactGroups.filter(g => !userConnectionIds.includes(g.UniqueId));

    res.render('connections/add', {
      availableUsers: filteredUsers,
      availableContacts: filteredContacts,
      availableGroups: filteredGroups
    });
  } catch (error) {
    console.error('Error loading add connection page:', error);
    req.flash('error_msg', 'Error loading page');
    res.redirect('/connections');
  }
});

// Add connection - process
router.post('/add', async (req, res) => {
  const { ConnectionType, ConnectedEntityId, RelationshipType, Notes, CanViewDocuments, CanViewAssets, NotifyOnUpdates } = req.body;

  try {
    if (!ConnectionType || !ConnectedEntityId) {
      req.flash('error_msg', 'Connection type and entity are required');
      return res.redirect('/connections/add');
    }

    // Check if connection already exists
    const existingConnections = await db.findAll('connections.json');
    const alreadyExists = existingConnections.find(c =>
      c.OwnerUser === req.session.user.UniqueId &&
      c.ConnectedEntityId === ConnectedEntityId
    );

    if (alreadyExists) {
      req.flash('error_msg', 'Connection already exists');
      return res.redirect('/connections/add');
    }

    // Create connection
    const newConnection = await db.create('connections.json', {
      OwnerUser: req.session.user.UniqueId,
      ConnectionType: ConnectionType,
      ConnectedEntityId: ConnectedEntityId,
      RelationshipType: RelationshipType || '',
      Notes: Notes || '',
      CanViewDocuments: CanViewDocuments === 'on',
      CanViewAssets: CanViewAssets === 'on',
      NotifyOnUpdates: NotifyOnUpdates === 'on',
      ConnectionStatus: 'active',
      ConnectedAt: new Date().toISOString(),
      CreatedBy: req.session.user.UniqueId
    });

    // If relationship type is Executor, send notification email
    if (RelationshipType && RelationshipType.toLowerCase() === 'executor') {
      const userName = `${req.session.user.FirstName} ${req.session.user.LastName}`;

      // Get executor email(s) based on connection type
      if (ConnectionType === 'user') {
        const user = await db.findById('users.json', ConnectedEntityId);
        if (user && user.Email) {
          await sendExecutorNotificationEmail(
            req.session.user.UniqueId,
            userName,
            user.Email,
            `${user.FirstName} ${user.LastName}`,
            newConnection.UniqueId
          );
        }
      } else if (ConnectionType === 'contact') {
        const contact = await db.findById('contacts.json', ConnectedEntityId);
        if (contact && contact.Email) {
          await sendExecutorNotificationEmail(
            req.session.user.UniqueId,
            userName,
            contact.Email,
            `${contact.FirstName} ${contact.LastName}`,
            newConnection.UniqueId
          );
        }
      } else if (ConnectionType === 'contact_group') {
        // For contact groups, send email to all members
        const group = await db.findById('contact_groups.json', ConnectedEntityId);
        if (group && group.Members && group.Members.length > 0) {
          const allContacts = await db.findAll('contacts.json');
          for (const memberId of group.Members) {
            const contact = allContacts.find(c => c.UniqueId === memberId);
            if (contact && contact.Email) {
              await sendExecutorNotificationEmail(
                req.session.user.UniqueId,
                userName,
                contact.Email,
                `${contact.FirstName} ${contact.LastName}`,
                newConnection.UniqueId
              );
            }
          }
        }
      }
    }

    req.flash('success_msg', 'Connection added successfully');
    res.redirect('/connections');
  } catch (error) {
    console.error('Error adding connection:', error);
    req.flash('error_msg', 'Error adding connection');
    res.redirect('/connections/add');
  }
});

// View connection details
router.get('/:id', async (req, res) => {
  try {
    const connection = await db.findById('connections.json', req.params.id);

    if (!connection || connection.OwnerUser !== req.session.user.UniqueId) {
      req.flash('error_msg', 'Connection not found');
      return res.redirect('/connections');
    }

    // Get connected entity details
    let connectedEntity = null;
    if (connection.ConnectionType === 'user') {
      connectedEntity = await db.findById('users.json', connection.ConnectedEntityId);
    } else if (connection.ConnectionType === 'contact') {
      // Contact data is now embedded in the connection
      if (connection.ContactDetails) {
        connectedEntity = {
          UniqueId: connection.ConnectedEntityId,
          FirstName: connection.ContactDetails.FirstName || '',
          LastName: connection.ContactDetails.LastName || '',
          Email: connection.ContactDetails.Email || '',
          PhoneNumber: connection.ContactDetails.PhoneNumber || '',
          Address: connection.ContactDetails.Address || '',
          Relationship: connection.RelationshipType,
          Notes: connection.Notes,
          AssociatedUserAccount: connection.ContactDetails.AssociatedUserAccount || ''
        };
      }
    } else if (connection.ConnectionType === 'contact_group') {
      connectedEntity = await db.findById('contact_groups.json', connection.ConnectedEntityId);

      // If it's a group, get member details from connections with embedded ContactDetails
      if (connectedEntity && connectedEntity.Members) {
        const allConnections = await db.findAll('connections.json');
        connectedEntity.MemberDetails = connectedEntity.Members.map(memberId => {
          // Find the connection for this member
          const memberConnection = allConnections.find(c =>
            c.ConnectedEntityId === memberId && c.ConnectionType === 'contact'
          );
          if (memberConnection && memberConnection.ContactDetails) {
            return {
              UniqueId: memberConnection.ConnectedEntityId,
              FirstName: memberConnection.ContactDetails.FirstName || '',
              LastName: memberConnection.ContactDetails.LastName || '',
              Email: memberConnection.ContactDetails.Email || '',
              PhoneNumber: memberConnection.ContactDetails.PhoneNumber || '',
              Address: memberConnection.ContactDetails.Address || ''
            };
          }
          return null;
        }).filter(Boolean);
      }
    }

    res.render('connections/view', {
      connection,
      connectedEntity
    });
  } catch (error) {
    console.error('Error viewing connection:', error);
    req.flash('error_msg', 'Error loading connection details');
    res.redirect('/connections');
  }
});

// Edit connection
router.get('/:id/edit', async (req, res) => {
  try {
    const connection = await db.findById('connections.json', req.params.id);

    if (!connection || connection.OwnerUser !== req.session.user.UniqueId) {
      req.flash('error_msg', 'Connection not found');
      return res.redirect('/connections');
    }

    // Get connected entity details for display
    let connectedEntity = null;
    if (connection.ConnectionType === 'user') {
      connectedEntity = await db.findById('users.json', connection.ConnectedEntityId);
    } else if (connection.ConnectionType === 'contact') {
      // Contact data is now embedded in the connection
      if (connection.ContactDetails) {
        connectedEntity = {
          UniqueId: connection.ConnectedEntityId,
          FirstName: connection.ContactDetails.FirstName || '',
          LastName: connection.ContactDetails.LastName || '',
          Email: connection.ContactDetails.Email || '',
          PhoneNumber: connection.ContactDetails.PhoneNumber || '',
          Address: connection.ContactDetails.Address || ''
        };
      }
    } else if (connection.ConnectionType === 'contact_group') {
      connectedEntity = await db.findById('contact_groups.json', connection.ConnectedEntityId);
    }

    res.render('connections/edit', {
      connection,
      connectedEntity
    });
  } catch (error) {
    console.error('Error loading edit page:', error);
    req.flash('error_msg', 'Error loading page');
    res.redirect('/connections');
  }
});

// Update connection
router.post('/:id/edit', async (req, res) => {
  const { RelationshipType, Notes, CanViewDocuments, CanViewAssets, NotifyOnUpdates, ConnectionStatus } = req.body;

  try {
    const connection = await db.findById('connections.json', req.params.id);

    if (!connection || connection.OwnerUser !== req.session.user.UniqueId) {
      req.flash('error_msg', 'Connection not found');
      return res.redirect('/connections');
    }

    // Check if relationship type changed to Executor
    const wasExecutor = connection.RelationshipType && connection.RelationshipType.toLowerCase() === 'executor';
    const isNowExecutor = RelationshipType && RelationshipType.toLowerCase() === 'executor';

    console.log('=== EXECUTOR UPDATE DEBUG ===');
    console.log('Connection ID:', req.params.id);
    console.log('Previous RelationshipType:', connection.RelationshipType);
    console.log('New RelationshipType:', RelationshipType);
    console.log('Was Executor:', wasExecutor);
    console.log('Is Now Executor:', isNowExecutor);
    console.log('Will send email:', !wasExecutor && isNowExecutor);

    await db.update('connections.json', req.params.id, {
      RelationshipType: RelationshipType || '',
      Notes: Notes || '',
      CanViewDocuments: CanViewDocuments === 'on',
      CanViewAssets: CanViewAssets === 'on',
      NotifyOnUpdates: NotifyOnUpdates === 'on',
      ConnectionStatus: ConnectionStatus || 'active'
    });

    // If newly designated as Executor, send notification email
    if (!wasExecutor && isNowExecutor) {
      console.log('=== SENDING EXECUTOR EMAIL ===');
      console.log('ConnectionType:', connection.ConnectionType);
      console.log('ConnectedEntityId:', connection.ConnectedEntityId);
      const userName = `${req.session.user.FirstName} ${req.session.user.LastName}`;

      // Get executor email(s) based on connection type
      if (connection.ConnectionType === 'user') {
        const user = await db.findById('users.json', connection.ConnectedEntityId);
        if (user && user.Email) {
          await sendExecutorNotificationEmail(
            req.session.user.UniqueId,
            userName,
            user.Email,
            `${user.FirstName} ${user.LastName}`,
            connection.UniqueId
          );
        }
      } else if (connection.ConnectionType === 'contact') {
        const contact = await db.findById('contacts.json', connection.ConnectedEntityId);
        if (contact && contact.Email) {
          await sendExecutorNotificationEmail(
            req.session.user.UniqueId,
            userName,
            contact.Email,
            `${contact.FirstName} ${contact.LastName}`,
            connection.UniqueId
          );
        }
      } else if (connection.ConnectionType === 'contact_group') {
        // For contact groups, send email to all members
        const group = await db.findById('contact_groups.json', connection.ConnectedEntityId);
        if (group && group.Members && group.Members.length > 0) {
          const allContacts = await db.findAll('contacts.json');
          for (const memberId of group.Members) {
            const contact = allContacts.find(c => c.UniqueId === memberId);
            if (contact && contact.Email) {
              await sendExecutorNotificationEmail(
                req.session.user.UniqueId,
                userName,
                contact.Email,
                `${contact.FirstName} ${contact.LastName}`,
                connection.UniqueId
              );
            }
          }
        }
      }
    }

    req.flash('success_msg', 'Connection updated successfully');
    res.redirect('/connections');
  } catch (error) {
    console.error('Error updating connection:', error);
    req.flash('error_msg', 'Error updating connection');
    res.redirect(`/connections/${req.params.id}/edit`);
  }
});

// Delete connection
router.delete('/:id', async (req, res) => {
  try {
    const connection = await db.findById('connections.json', req.params.id);

    if (!connection || connection.OwnerUser !== req.session.user.UniqueId) {
      req.flash('error_msg', 'Connection not found');
      return res.redirect('/connections');
    }

    await db.delete('connections.json', req.params.id);
    req.flash('success_msg', 'Connection removed successfully');
    res.redirect('/connections');
  } catch (error) {
    console.error('Error deleting connection:', error);
    req.flash('error_msg', 'Error removing connection');
    res.redirect('/connections');
  }
});

module.exports = router;

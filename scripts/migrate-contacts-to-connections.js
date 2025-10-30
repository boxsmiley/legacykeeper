const db = require('../models/database');
const { sendExecutorNotificationEmail } = require('../routes/executorNotifications');

async function migrateContactsToConnections() {
  console.log('Starting contact migration to connections...');

  try {
    // Get all existing contacts and connections
    const allContacts = await db.findAll('contacts.json');
    const allConnections = await db.findAll('connections.json');
    const allUsers = await db.findAll('users.json');

    console.log(`Found ${allContacts.length} contacts to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const contact of allContacts) {
      try {
        // Check if connection already exists for this contact
        const existingConnection = allConnections.find(c =>
          c.OwnerUser === contact.OwnerUser &&
          c.ConnectionType === 'contact' &&
          c.ConnectedEntityId === contact.UniqueId
        );

        if (existingConnection) {
          console.log(`Skipping contact ${contact.UniqueId} - connection already exists`);
          skippedCount++;
          continue;
        }

        // Create new connection with embedded contact data
        const newConnection = await db.create('connections.json', {
          OwnerUser: contact.OwnerUser,
          ConnectionType: 'contact',
          ConnectedEntityId: contact.UniqueId,
          RelationshipType: contact.Relationship || '',
          Notes: contact.Notes || '',
          CanViewDocuments: false,
          CanViewAssets: false,
          NotifyOnUpdates: true,
          ConnectionStatus: 'active',
          ConnectedAt: contact.DateAdded || new Date().toISOString(),
          CreatedBy: contact.CreatedBy || contact.OwnerUser,
          // Embedded contact details
          ContactDetails: {
            FirstName: contact.FirstName,
            LastName: contact.LastName,
            Email: contact.Email,
            PhoneNumber: contact.PhoneNumber,
            Address: contact.Address,
            AssociatedUserAccount: contact.AssociatedUserAccount
          }
        });

        console.log(`Migrated contact ${contact.UniqueId} -> connection ${newConnection.UniqueId}`);
        migratedCount++;

        // If relationship is Executor, send notification email
        if (contact.Relationship && contact.Relationship.toLowerCase() === 'executor' && contact.Email) {
          const ownerUser = allUsers.find(u => u.UniqueId === contact.OwnerUser);
          if (ownerUser) {
            const userName = `${ownerUser.FirstName} ${ownerUser.LastName}`;
            await sendExecutorNotificationEmail(
              contact.OwnerUser,
              userName,
              contact.Email,
              `${contact.FirstName} ${contact.LastName}`,
              newConnection.UniqueId
            );
            console.log(`Sent executor email to ${contact.Email}`);
          }
        }
      } catch (error) {
        console.error(`Error migrating contact ${contact.UniqueId}:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Total contacts: ${allContacts.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped (already exist): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    return {
      success: true,
      total: allContacts.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateContactsToConnections()
    .then(result => {
      if (result.success) {
        console.log('\nMigration completed successfully!');
        process.exit(0);
      } else {
        console.error('\nMigration failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { migrateContactsToConnections };

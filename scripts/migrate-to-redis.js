#!/usr/bin/env node

/**
 * Migration Script: JSON Files to Redis
 *
 * This script migrates all data from JSON files to Redis
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const redisDb = require('../models/redis-database');

// JSON file database (old system)
const dataDir = path.join(__dirname, '../data');

// Collection files to migrate
const collections = [
  'users.json',
  'documents.json',
  'contacts.json',
  'contact_groups.json',
  'digital_assets.json',
  'financial_assets.json',
  'legacy_entries.json',
  'audit_logs.json',
  'subscriptions.json',
  'subscription_plans.json',
  'messages.json',
  'chat_messages.json',
  'conversations.json'
];

/**
 * Read JSON file
 */
function readJsonFile(filename) {
  const filepath = path.join(dataDir, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  File not found: ${filename} - skipping`);
    return [];
  }

  try {
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error reading ${filename}:`, error.message);
    return [];
  }
}

/**
 * Backup JSON files before migration
 */
function backupJsonFiles() {
  const backupDir = path.join(dataDir, `backup-${Date.now()}`);

  if (!fs.existsSync(dataDir)) {
    console.log('⚠️  No data directory found - nothing to backup');
    return;
  }

  console.log(`\n📦 Creating backup in ${backupDir}...`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  let backedUp = 0;

  collections.forEach(collection => {
    const sourcePath = path.join(dataDir, collection);
    const backupPath = path.join(backupDir, collection);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, backupPath);
      backedUp++;
    }
  });

  console.log(`✅ Backed up ${backedUp} files`);
  return backupDir;
}

/**
 * Migrate a single collection
 */
async function migrateCollection(collection) {
  console.log(`\n📄 Migrating ${collection}...`);

  const data = readJsonFile(collection);

  if (data.length === 0) {
    console.log(`   ⚠️  No data found - skipping`);
    return { collection, count: 0, success: true };
  }

  try {
    // Write all data to Redis
    await redisDb.writeData(collection, data);

    // Verify the migration
    const verifyData = await redisDb.findAll(collection);

    if (verifyData.length === data.length) {
      console.log(`   ✅ Migrated ${data.length} items`);
      return { collection, count: data.length, success: true };
    } else {
      console.error(`   ❌ Verification failed: Expected ${data.length}, got ${verifyData.length}`);
      return { collection, count: 0, success: false, error: 'Verification failed' };
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { collection, count: 0, success: false, error: error.message };
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 LegacyKeeper: JSON to Redis Migration');
  console.log('==========================================\n');

  // Check if Redis is available
  try {
    await redisDb.redis.ping();
    console.log('✅ Redis connection successful\n');
  } catch (error) {
    console.error('❌ Cannot connect to Redis:', error.message);
    console.error('\n💡 Make sure Redis is running:');
    console.error('   sudo systemctl start redis');
    console.error('   or');
    console.error('   redis-server\n');
    process.exit(1);
  }

  // Backup existing data
  const backupDir = backupJsonFiles();

  // Confirm migration
  console.log('\n⚠️  WARNING: This will replace all data in Redis!');
  console.log('   Backup created at:', backupDir || 'N/A');

  // In a real scenario, you'd prompt for confirmation
  // For now, we'll proceed automatically
  console.log('\n▶️  Starting migration...\n');

  const results = [];

  // Migrate each collection
  for (const collection of collections) {
    const result = await migrateCollection(collection);
    results.push(result);
  }

  // Summary
  console.log('\n📊 Migration Summary');
  console.log('====================\n');

  let totalItems = 0;
  let successCount = 0;
  let failCount = 0;

  results.forEach(result => {
    if (result.success) {
      successCount++;
      totalItems += result.count;
      console.log(`✅ ${result.collection.padEnd(30)} ${result.count} items`);
    } else {
      failCount++;
      console.log(`❌ ${result.collection.padEnd(30)} FAILED: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`Total Collections: ${results.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total Items Migrated: ${totalItems}`);

  // Get Redis stats
  const stats = await redisDb.getStats();
  console.log(`\nRedis Database Size: ${stats.dbSize} keys`);

  console.log('\n✅ Migration complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Test the application with Redis');
  console.log('   2. If everything works, you can delete JSON files');
  console.log('   3. Set USE_REDIS=true in .env (already set)');

  // Close Redis connection
  await redisDb.close();
}

// Run migration
migrate().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});

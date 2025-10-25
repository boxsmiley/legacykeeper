/**
 * Database Module - Unified interface for JSON and Redis storage
 *
 * This module provides a unified API that works with both:
 * - JSON file storage (original system)
 * - Redis storage (new system)
 *
 * Set USE_REDIS=true in .env to use Redis
 */

require('dotenv').config();

// Check which database to use
const useRedis = process.env.USE_REDIS === 'true';

if (useRedis) {
  console.log('🔴 Using Redis for data storage');
  const redisDb = require('./redis-database');

  // Export Redis database with wrapped async methods
  module.exports = {
    // Async methods that return promises
    async create(collection, item) {
      return await redisDb.create(collection, item);
    },

    async findAll(collection) {
      return await redisDb.findAll(collection);
    },

    async findById(collection, id) {
      return await redisDb.findById(collection, id);
    },

    async findByField(collection, field, value) {
      return await redisDb.findByField(collection, field, value);
    },

    async update(collection, id, updates) {
      return await redisDb.update(collection, id, updates);
    },

    async delete(collection, id) {
      return await redisDb.delete(collection, id);
    },

    // Utility methods
    generateSlug(item) {
      return redisDb.generateSlug(item);
    },

    async getStats() {
      return await redisDb.getStats();
    },

    async close() {
      return await redisDb.close();
    },

    // Expose Redis instance for advanced use
    redis: redisDb.redis,

    // Type identifier
    type: 'redis'
  };
} else {
  console.log('📄 Using JSON files for data storage');
  const jsonDb = require('./database-backup');

  // Wrap synchronous JSON methods to return promises for consistency
  module.exports = {
    async create(collection, item) {
      return jsonDb.create(collection, item);
    },

    async findAll(collection) {
      return jsonDb.findAll(collection);
    },

    async findById(collection, id) {
      return jsonDb.findById(collection, id);
    },

    async findByField(collection, field, value) {
      return jsonDb.findByField(collection, field, value);
    },

    async update(collection, id, updates) {
      return jsonDb.update(collection, id, updates);
    },

    async delete(collection, id) {
      return jsonDb.delete(collection, id);
    },

    generateSlug(item) {
      return jsonDb.generateSlug(item);
    },

    async close() {
      // No-op for JSON
      return Promise.resolve();
    },

    // Type identifier
    type: 'json'
  };
}

// Export type for checking
module.exports.isRedis = useRedis;
module.exports.isJson = !useRedis;

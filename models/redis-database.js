const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class RedisDatabase {
  constructor() {
    // Initialize Redis connection
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableOfflineQueue: true,
      lazyConnect: false,
      // Connection timeout
      connectTimeout: 10000,
      // Keep alive
      keepAlive: 30000
    };

    // Add password if provided
    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    // Add username if provided (Redis 6.0+)
    if (process.env.REDIS_USERNAME) {
      redisConfig.username = process.env.REDIS_USERNAME;
    }

    this.redis = new Redis(redisConfig);

    // Handle Redis connection events
    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis is ready to accept commands');
    });

    // Track if Redis is connected
    this.isConnected = false;
    this.redis.on('ready', () => {
      this.isConnected = true;
    });
  }

  /**
   * Generate a collection key for Redis
   * @param {string} collection - Collection name (e.g., 'users.json')
   * @returns {string} Redis key
   */
  getCollectionKey(collection) {
    // Remove .json extension if present
    const collectionName = collection.replace('.json', '');
    return `legacykeeper:${collectionName}`;
  }

  /**
   * Generate an item key for Redis
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @returns {string} Redis key
   */
  getItemKey(collection, id) {
    const collectionName = collection.replace('.json', '');
    return `legacykeeper:${collectionName}:${id}`;
  }

  /**
   * Get all item IDs in a collection
   * @param {string} collection - Collection name
   * @returns {Promise<Array<string>>} Array of item IDs
   */
  async getCollectionIds(collection) {
    const collectionKey = this.getCollectionKey(collection);
    const ids = await this.redis.smembers(collectionKey);
    return ids || [];
  }

  /**
   * Read all data from a collection
   * @param {string} collection - Collection name
   * @returns {Promise<Array<Object>>} Array of items
   */
  async readData(collection) {
    try {
      const ids = await this.getCollectionIds(collection);

      if (ids.length === 0) {
        return [];
      }

      // Fetch all items in parallel
      const pipeline = this.redis.pipeline();
      ids.forEach(id => {
        pipeline.get(this.getItemKey(collection, id));
      });

      const results = await pipeline.exec();

      // Parse and filter valid items
      const items = results
        .map(([err, data]) => {
          if (err || !data) return null;
          try {
            return JSON.parse(data);
          } catch (e) {
            console.error('Error parsing item:', e);
            return null;
          }
        })
        .filter(item => item !== null);

      return items;
    } catch (error) {
      console.error(`Error reading collection ${collection}:`, error);
      return [];
    }
  }

  /**
   * Write data to a collection (replaces all data)
   * @param {string} collection - Collection name
   * @param {Array<Object>} data - Array of items
   * @returns {Promise<void>}
   */
  async writeData(collection, data) {
    try {
      const collectionKey = this.getCollectionKey(collection);

      // Get existing IDs
      const existingIds = await this.redis.smembers(collectionKey);

      // Delete all existing items
      if (existingIds.length > 0) {
        const pipeline = this.redis.pipeline();
        existingIds.forEach(id => {
          pipeline.del(this.getItemKey(collection, id));
        });
        await pipeline.exec();
      }

      // Clear the collection set
      await this.redis.del(collectionKey);

      // Write new data
      if (data.length > 0) {
        const pipeline = this.redis.pipeline();

        data.forEach(item => {
          if (item.UniqueId) {
            const itemKey = this.getItemKey(collection, item.UniqueId);
            pipeline.set(itemKey, JSON.stringify(item));
            pipeline.sadd(collectionKey, item.UniqueId);
          }
        });

        await pipeline.exec();
      }
    } catch (error) {
      console.error(`Error writing collection ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Create a new item in a collection
   * @param {string} collection - Collection name
   * @param {Object} item - Item data
   * @returns {Promise<Object>} Created item with ID
   */
  async create(collection, item) {
    try {
      const newItem = {
        ...item,
        UniqueId: uuidv4(),
        CreatedDate: new Date().toISOString(),
        ModifiedDate: new Date().toISOString(),
        Slug: this.generateSlug(item)
      };

      const itemKey = this.getItemKey(collection, newItem.UniqueId);
      const collectionKey = this.getCollectionKey(collection);

      // Store item and add ID to collection set
      const pipeline = this.redis.pipeline();
      pipeline.set(itemKey, JSON.stringify(newItem));
      pipeline.sadd(collectionKey, newItem.UniqueId);
      await pipeline.exec();

      return newItem;
    } catch (error) {
      console.error(`Error creating item in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Find all items in a collection
   * @param {string} collection - Collection name
   * @returns {Promise<Array<Object>>} Array of items
   */
  async findAll(collection) {
    return await this.readData(collection);
  }

  /**
   * Find an item by ID
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @returns {Promise<Object|null>} Item or null if not found
   */
  async findById(collection, id) {
    try {
      const itemKey = this.getItemKey(collection, id);
      const data = await this.redis.get(itemKey);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error(`Error finding item ${id} in ${collection}:`, error);
      return null;
    }
  }

  /**
   * Find items by field value
   * @param {string} collection - Collection name
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @returns {Promise<Array<Object>>} Array of matching items
   */
  async findByField(collection, field, value) {
    try {
      const allItems = await this.readData(collection);
      return allItems.filter(item => item[field] === value);
    } catch (error) {
      console.error(`Error finding by field in ${collection}:`, error);
      return [];
    }
  }

  /**
   * Update an item
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated item or null if not found
   */
  async update(collection, id, updates) {
    try {
      const existingItem = await this.findById(collection, id);

      if (!existingItem) {
        return null;
      }

      const updatedItem = {
        ...existingItem,
        ...updates,
        UniqueId: existingItem.UniqueId, // Preserve ID
        CreatedDate: existingItem.CreatedDate, // Preserve creation date
        ModifiedDate: new Date().toISOString()
      };

      const itemKey = this.getItemKey(collection, id);
      await this.redis.set(itemKey, JSON.stringify(updatedItem));

      return updatedItem;
    } catch (error) {
      console.error(`Error updating item ${id} in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Delete an item
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(collection, id) {
    try {
      const itemKey = this.getItemKey(collection, id);
      const collectionKey = this.getCollectionKey(collection);

      // Check if item exists
      const exists = await this.redis.exists(itemKey);

      if (!exists) {
        return false;
      }

      // Delete item and remove from collection set
      const pipeline = this.redis.pipeline();
      pipeline.del(itemKey);
      pipeline.srem(collectionKey, id);
      await pipeline.exec();

      return true;
    } catch (error) {
      console.error(`Error deleting item ${id} from ${collection}:`, error);
      return false;
    }
  }

  /**
   * Generate a slug for an item
   * @param {Object} item - Item data
   * @returns {string} Generated slug
   */
  generateSlug(item) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Close Redis connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      console.log('Redis connection closed');
    }
  }

  /**
   * Flush all data (USE WITH CAUTION - for testing only)
   * @returns {Promise<void>}
   */
  async flushAll() {
    console.warn('⚠️  FLUSHING ALL REDIS DATA');
    await this.redis.flushdb();
  }

  /**
   * Get Redis statistics
   * @returns {Promise<Object>} Redis info
   */
  async getStats() {
    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();

      return {
        connected: this.isConnected,
        dbSize,
        info
      };
    } catch (error) {
      console.error('Error getting Redis stats:', error);
      return null;
    }
  }
}

module.exports = new RedisDatabase();

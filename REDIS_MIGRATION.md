# Redis Migration Guide for LegacyKeeper

This document explains the migration from JSON file storage to Redis for improved performance and scalability.

## Why Redis?

### Benefits Over JSON Files

1. **Performance**: In-memory data store with microsecond latency
2. **Scalability**: Handle thousands of concurrent connections
3. **Persistence**: Data is persisted to disk with configurable strategies
4. **Advanced Features**: Pub/sub, transactions, atomic operations
5. **Production-Ready**: Battle-tested in production environments
6. **Concurrency**: Handle concurrent reads/writes without file locking issues
7. **Query Performance**: Fast lookups by ID without scanning entire files

### Performance Comparison

| Operation | JSON Files | Redis |
|-----------|-----------|-------|
| Read all users | O(1) file read + parse | O(N) network + memory access |
| Find by ID | O(N) scan | O(1) hash lookup |
| Update item | O(N) read + write | O(1) update |
| Concurrent access | File locking issues | Concurrent safe |
| Memory usage | Load on demand | All in memory |

## Architecture

### Data Storage Model

#### JSON Files (Old)
```
data/
├── users.json          (Array of all users)
├── documents.json      (Array of all documents)
└── ...
```

#### Redis (New)
```
Redis Keys:
legacykeeper:users                      (Set of user IDs)
legacykeeper:users:{userId}            (Hash of user data)
legacykeeper:documents                  (Set of document IDs)
legacykeeper:documents:{documentId}    (Hash of document data)
```

### Database Adapter Pattern

The system uses a unified interface that works with both JSON and Redis:

```javascript
// Same API for both JSON and Redis
const db = require('./models/database');

// All methods are async now
const users = await db.findAll('users.json');
const user = await db.findById('users.json', userId);
await db.create('users.json', userData);
await db.update('users.json', userId, updates);
await db.delete('users.json', userId);
```

## Installation & Setup

### 1. Install Redis

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### macOS
```bash
brew install redis
brew services start redis
```

#### Docker
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### 2. Verify Redis Installation
```bash
redis-cli ping
# Should return: PONG
```

### 3. Configure Environment

Update `.env`:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
USE_REDIS=true
```

### 4. Install Node.js Dependencies

Already installed:
```bash
npm install redis ioredis
```

## Migration Process

### Automatic Migration

Run the migration script:
```bash
node scripts/migrate-to-redis.js
```

The script will:
1. ✅ Connect to Redis
2. 📦 Create backup of JSON files
3. 📊 Migrate all data to Redis
4. ✅ Verify migration success
5. 📈 Show statistics

### Manual Verification

Check migrated data:
```bash
# Count total keys
redis-cli dbsize

# List all collections
redis-cli keys "legacykeeper:*"

# Get specific user
redis-cli get "legacykeeper:users:{userId}"

# Get all user IDs
redis-cli smembers "legacykeeper:users"
```

### Rollback to JSON

If needed, rollback to JSON:

1. Set `USE_REDIS=false` in `.env`
2. Restore from backup:
   ```bash
   cp data/backup-{timestamp}/* data/
   ```
3. Restart server

## Configuration

### Redis Connection Options

Edit `models/redis-database.js` for advanced configuration:

```javascript
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'your_password',
  db: 0,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Connection timeout
  connectTimeout: 10000,
  // Command timeout
  commandTimeout: 5000,
  // Keep alive
  keepAlive: 30000
});
```

### Persistence Configuration

Redis offers two persistence options:

#### RDB (Redis Database Backup)
Periodic snapshots of dataset
```bash
# /etc/redis/redis.conf
save 900 1      # After 900 sec if at least 1 key changed
save 300 10     # After 300 sec if at least 10 keys changed
save 60 10000   # After 60 sec if at least 10000 keys changed
```

#### AOF (Append Only File)
Logs every write operation
```bash
# /etc/redis/redis.conf
appendonly yes
appendfsync everysec  # everysec, always, or no
```

## Performance Optimization

### 1. Connection Pooling

The Redis client automatically manages connection pooling.

### 2. Pipeline Commands

For bulk operations:
```javascript
const pipeline = redis.pipeline();
items.forEach(item => {
  pipeline.set(key, JSON.stringify(item));
});
await pipeline.exec();
```

### 3. Memory Optimization

Configure Redis memory limits:
```bash
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru  # Eviction policy
```

### 4. Monitoring

Monitor Redis performance:
```bash
# Real-time stats
redis-cli --stat

# Slow query log
redis-cli slowlog get 10

# Memory usage
redis-cli info memory
```

## Code Changes

### Routes Example

#### Before (JSON - Synchronous)
```javascript
router.get('/', (req, res) => {
  const users = db.findAll('users.json');
  res.render('users', { users });
});
```

#### After (Redis - Asynchronous)
```javascript
router.get('/', async (req, res) => {
  const users = await db.findAll('users.json');
  res.render('users', { users });
});
```

### Error Handling

Add proper error handling for async operations:
```javascript
router.get('/', async (req, res) => {
  try {
    const users = await db.findAll('users.json');
    res.render('users', { users });
  } catch (error) {
    console.error('Error fetching users:', error);
    req.flash('error_msg', 'Error loading users');
    res.redirect('/dashboard');
  }
});
```

## Monitoring & Maintenance

### Redis CLI Commands

```bash
# Check connection
redis-cli ping

# Get server info
redis-cli info

# Monitor commands in real-time
redis-cli monitor

# Check memory usage
redis-cli info memory

# Get slow queries
redis-cli slowlog get 10

# Flush database (CAUTION!)
redis-cli flushdb

# Flush all databases (DANGER!)
redis-cli flushall
```

### Health Check Endpoint

Add to your application:
```javascript
app.get('/health/redis', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({
      status: 'healthy',
      redis: stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## Backup & Recovery

### Backup Redis Data

#### Manual Backup
```bash
# Create RDB snapshot
redis-cli bgsave

# Copy snapshot
cp /var/lib/redis/dump.rdb /backup/dump-$(date +%Y%m%d).rdb
```

#### Automated Backup Script
```bash
#!/bin/bash
# backup-redis.sh
BACKUP_DIR="/backup/redis"
DATE=$(date +%Y%m%d_%H%M%S)

redis-cli bgsave
sleep 5
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/dump-$DATE.rdb"
```

### Restore Redis Data

```bash
# Stop Redis
sudo systemctl stop redis-server

# Restore snapshot
cp /backup/dump-20250124.rdb /var/lib/redis/dump.rdb

# Start Redis
sudo systemctl start redis-server
```

### Export to JSON (Backup Strategy)

Create a script to export Redis data back to JSON:
```javascript
// scripts/export-redis-to-json.js
const redisDb = require('../models/redis-database');
const fs = require('fs');

async function exportToJson() {
  const collections = ['users', 'documents', ...];

  for (const collection of collections) {
    const data = await redisDb.findAll(`${collection}.json`);
    fs.writeFileSync(
      `data/${collection}.json`,
      JSON.stringify(data, null, 2)
    );
  }
}
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Redis
```
Error: Redis connection refused
```

**Solutions**:
1. Check if Redis is running:
   ```bash
   sudo systemctl status redis-server
   ```
2. Check Redis configuration:
   ```bash
   redis-cli ping
   ```
3. Verify firewall settings
4. Check `.env` configuration

### Memory Issues

**Problem**: Redis out of memory
```
Error: OOM command not allowed
```

**Solutions**:
1. Increase maxmemory:
   ```bash
   redis-cli config set maxmemory 512mb
   ```
2. Configure eviction policy:
   ```bash
   redis-cli config set maxmemory-policy allkeys-lru
   ```
3. Monitor memory usage:
   ```bash
   redis-cli info memory
   ```

### Performance Issues

**Problem**: Slow queries

**Solutions**:
1. Check slow log:
   ```bash
   redis-cli slowlog get 10
   ```
2. Use pipelining for bulk operations
3. Optimize data structures
4. Add indexes for frequently queried fields

### Data Inconsistency

**Problem**: Data not matching expected format

**Solutions**:
1. Verify migration:
   ```bash
   node scripts/migrate-to-redis.js
   ```
2. Check Redis data:
   ```bash
   redis-cli get "legacykeeper:users:{id}"
   ```
3. Rollback to JSON if needed

## Security

### Redis Security Best Practices

1. **Set Password**
   ```bash
   # /etc/redis/redis.conf
   requirepass your_strong_password_here
   ```

2. **Bind to Localhost Only**
   ```bash
   bind 127.0.0.1
   ```

3. **Disable Dangerous Commands**
   ```bash
   rename-command FLUSHDB ""
   rename-command FLUSHALL ""
   rename-command CONFIG ""
   ```

4. **Enable SSL/TLS**
   ```bash
   tls-port 6379
   tls-cert-file /path/to/cert.pem
   tls-key-file /path/to/key.pem
   ```

5. **Use Firewall**
   ```bash
   sudo ufw allow from 192.168.1.0/24 to any port 6379
   ```

## Production Deployment

### Redis Configuration for Production

```bash
# /etc/redis/redis.conf

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Memory
maxmemory 4gb
maxmemory-policy allkeys-lru

# Security
requirepass your_strong_password
bind 127.0.0.1

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

### Monitoring Setup

Use Redis monitoring tools:
- **Redis Commander**: Web-based UI
- **RedisInsight**: Official GUI
- **Prometheus + Grafana**: Metrics collection

### High Availability

For production, consider:
- **Redis Sentinel**: Automatic failover
- **Redis Cluster**: Horizontal scaling
- **Replication**: Master-slave setup

## Testing

### Unit Tests

```javascript
describe('Redis Database', () => {
  it('should create an item', async () => {
    const item = await db.create('test.json', { name: 'Test' });
    expect(item).toHaveProperty('UniqueId');
  });

  it('should find item by ID', async () => {
    const item = await db.findById('test.json', itemId);
    expect(item.name).toBe('Test');
  });
});
```

### Integration Tests

Test with actual Redis instance in test environment.

## Migration Checklist

- [x] Install Redis server
- [x] Install Node.js Redis clients
- [x] Create Redis database adapter
- [x] Update database.js to support both JSON and Redis
- [x] Create migration script
- [x] Backup existing JSON data
- [x] Run migration
- [x] Verify data integrity
- [ ] Update all routes to use async/await
- [ ] Test application thoroughly
- [ ] Monitor Redis performance
- [ ] Setup backup strategy
- [ ] Configure production Redis
- [ ] Document changes

## Summary

Redis provides significant performance and scalability improvements over JSON file storage. The migration is straightforward with the provided tools, and the unified database interface ensures backward compatibility. Monitor Redis performance and configure appropriate persistence and backup strategies for production use.

For questions or issues, refer to:
- [Redis Documentation](https://redis.io/documentation)
- [ioredis GitHub](https://github.com/luin/ioredis)
- LegacyKeeper support channels

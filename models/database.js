const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.ensureDataDir();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  readData(filename) {
    const filepath = path.join(this.dataDir, filename);
    if (!fs.existsSync(filepath)) {
      return [];
    }
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  }

  writeData(filename, data) {
    const filepath = path.join(this.dataDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }

  create(collection, item) {
    const data = this.readData(collection);
    const newItem = {
      ...item,
      UniqueId: uuidv4(),
      CreatedDate: new Date().toISOString(),
      ModifiedDate: new Date().toISOString(),
      Slug: this.generateSlug(item)
    };
    data.push(newItem);
    this.writeData(collection, data);
    return newItem;
  }

  findAll(collection) {
    return this.readData(collection);
  }

  findById(collection, id) {
    const data = this.readData(collection);
    return data.find(item => item.UniqueId === id);
  }

  findByField(collection, field, value) {
    const data = this.readData(collection);
    return data.filter(item => item[field] === value);
  }

  update(collection, id, updates) {
    const data = this.readData(collection);
    const index = data.findIndex(item => item.UniqueId === id);
    if (index === -1) return null;

    data[index] = {
      ...data[index],
      ...updates,
      ModifiedDate: new Date().toISOString()
    };
    this.writeData(collection, data);
    return data[index];
  }

  delete(collection, id) {
    const data = this.readData(collection);
    const filtered = data.filter(item => item.UniqueId !== id);
    this.writeData(collection, filtered);
    return filtered.length < data.length;
  }

  generateSlug(item) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }
}

module.exports = new Database();

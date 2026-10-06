// Isolated in-memory MongoDB (replica set, so transactions work) for tests.
// No production database or credentials are ever touched.
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet = null;

async function connectTestDB() {
  if (mongoose.connection.readyState !== 0) return;
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
}

async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
}

async function disconnectTestDB() {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
    replSet = null;
  }
}

module.exports = { connectTestDB, clearTestDB, disconnectTestDB };

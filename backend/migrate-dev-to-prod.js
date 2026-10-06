require('dotenv').config();
const mongoose = require('mongoose');

// Connection strings must come from the environment — never hardcode credentials.
const DEV_URI = process.env.DEV_MONGODB_URI;
const PROD_URI = process.env.MONGODB_URI || process.env.PROD_MONGODB_URI;
if (!DEV_URI || !PROD_URI) {
  console.error('Set DEV_MONGODB_URI and MONGODB_URI env vars before migrating.');
  process.exit(1);
}

const migrateData = async () => {
  try {
    console.log('🔄 Starting data migration from DEV to PROD...\n');

    // Connect to DEV database
    const devConn = await mongoose.createConnection(DEV_URI).asPromise();
    console.log('✅ Connected to DEV database');

    // Connect to PROD database
    const prodConn = await mongoose.createConnection(PROD_URI).asPromise();
    console.log('✅ Connected to PROD database\n');

    // Get all collections from DEV
    const collections = await devConn.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in DEV database\n`);

    let totalDocuments = 0;

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        continue;
      }

      console.log(`📦 Migrating collection: ${collectionName}`);

      // Get all documents from DEV collection
      const devCollection = devConn.db.collection(collectionName);
      const documents = await devCollection.find({}).toArray();

      if (documents.length === 0) {
        console.log(`   ⚠️  Empty collection, skipping\n`);
        continue;
      }

      // Get PROD collection
      const prodCollection = prodConn.db.collection(collectionName);

      // Clear existing data in PROD collection (optional - comment out if you want to keep existing data)
      const deleteResult = await prodCollection.deleteMany({});
      console.log(`   🗑️  Deleted ${deleteResult.deletedCount} existing documents`);

      // Insert documents into PROD
      const insertResult = await prodCollection.insertMany(documents);
      console.log(`   ✅ Inserted ${insertResult.insertedCount} documents\n`);

      totalDocuments += insertResult.insertedCount;
    }

    console.log('='.repeat(60));
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Total documents migrated: ${totalDocuments}`);
    console.log('='.repeat(60));

    await devConn.close();
    await prodConn.close();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  }
};

migrateData();

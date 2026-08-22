const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName =
  process.env.MONGODB_DATABASE || "bibliodrop";

if (!uri) {
  throw new Error(
    "MONGODB_URI is not defined"
  );
}

const client = new MongoClient(uri);

let db;

async function connectDB() {
  try {
    await client.connect();

    db = client.db(dbName);

    console.log(
      "MongoDB connected successfully"
    );

    return db;
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    throw error;
  }
}

function getDB() {
  if (!db) {
    throw new Error(
      "Database is not connected"
    );
  }

  return db;
}

module.exports = {
  connectDB,
  getDB,
};
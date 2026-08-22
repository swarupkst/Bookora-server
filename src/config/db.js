const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DATABASE || "bibliodrop";

if (!uri) {
  throw new Error("MONGODB_URI is not defined in .env");
}

const client = new MongoClient(uri);

let database;

async function connectDB() {
  try {
    await client.connect();

    database = client.db(dbName);

    console.log("MongoDB connected successfully");

    return database;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

function getDB() {
  if (!database) {
    throw new Error("Database is not connected");
  }

  return database;
}

module.exports = {
  connectDB,
  getDB,
};
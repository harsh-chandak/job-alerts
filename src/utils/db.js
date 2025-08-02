import { MongoClient } from "mongodb";
import { getConfig } from "./server/auth"; // where your decoded user lives

const globalOptions = { useNewUrlParser: true, useUnifiedTopology: true };

let cachedMasterClient = null;
let cachedClientDb = null;

// Used before login — connects to master DB (where users are stored)
export async function masterPromise() {
  const uri = process.env.mongo_uri;
  if (!uri) throw new Error("Please define MONGODB_URI in .env");

  if (!cachedMasterClient) {
    const client = new MongoClient(uri, globalOptions);
    cachedMasterClient = await client.connect();
  }

  return cachedMasterClient // or your master DB name
}

// Used after login — connects to tenant-specific DB using user's mongo_uri
export async function clientPromise(req) {
  if (cachedClientDb) return cachedClientDb;

  const config = await getConfig(req); // contains user's mongo_uri
  const uri = config.mongo_uri;

  if (!uri) throw new Error("No mongo_uri found in user config");

  const client = new MongoClient(uri, globalOptions);
  const connected = await client.connect();
  cachedClientDb = connected; // optionally use a db name here
  return cachedClientDb;
}

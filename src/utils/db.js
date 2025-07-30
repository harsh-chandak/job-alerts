// src/utils/db.js
import { MongoClient } from "mongodb";

let client;
let clientPromise;

const uri = String(process.env.mongo_uri);

if (!uri) {
  throw new Error("Please define MONGODB_URI in .env");
}

if (!clientPromise) {
  client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  clientPromise = client.connect();
}

export default clientPromise;
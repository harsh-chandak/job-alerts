// src/utils/server/auth.js
import jwt from 'jsonwebtoken';
import { masterPromise } from '@/utils/db';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET;

export async function verifyToken(req, res, next) {
  const token = req?.headers?.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = (await masterPromise()).db('job-alerts');
    const users = db.collection('users');

    const user = await users.findOne({ _id: new ObjectId(decoded.id) });
    if (!user) return res.status(403).json({ error: 'Forbidden: Invalid user' });
    if (!user.is_approved) return res.status(403).json({ error: 'User not approved yet' });
    user.readOnly = decoded?.readOnly
    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export async function getDecodedUser(req) {
  if (!req.user) throw new Error('No user is set. Call verifyToken first.');
  return req.user;
}

export async function getConfig(req) {
  if (req.cachedConfig) return req.cachedConfig;

  const user = await getDecodedUser(req);
  const config = {
    discord_uri: user.discord_uri,
    mongo_uri: user.mongo_uri,
    email: user.email,
    slug: user.slug,
  };

  req.cachedConfig = config;
  return config;
}

export function withAuth(handler) {
  return async (req, res) => {
    await verifyToken(req, res, async () => {
      return handler(req, res);
    });
  };
}

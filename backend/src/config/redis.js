const { createClient } = require('redis');

let client = null;
let isConnected = false;
let hasWarned = false;

const connectRedis = async () => {
  if (client && isConnected) return client;

  // Skip if no REDIS_URL is set and we're in development
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl && process.env.NODE_ENV !== 'production') {
    if (!hasWarned) {
      console.info('Redis: No REDIS_URL configured — using in-memory fallback (this is fine for development)');
      hasWarned = true;
    }
    return null;
  }

  try {
    client = createClient({
      url: redisUrl || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 2) {
            if (!hasWarned) {
              console.warn('Redis: Connection failed after retries — falling back to in-memory store');
              hasWarned = true;
            }
            return false; // Stop reconnecting
          }
          return Math.min(retries * 500, 3000);
        },
        connectTimeout: 5000,
      }
    });

    // Only log errors once to avoid spam
    client.on('error', (err) => {
      if (!hasWarned) {
        console.warn(`Redis: ${err.message} — using in-memory fallback`);
        hasWarned = true;
      }
    });
    client.on('connect', () => { isConnected = true; console.log('Redis: Connected successfully'); });
    client.on('end', () => { isConnected = false; });

    await client.connect();
  } catch (err) {
    if (!hasWarned) {
      console.info(`Redis: Unavailable (${err.message}) — using in-memory fallback`);
      hasWarned = true;
    }
    client = null;
  }

  return client;
};

const getRedis = () => client;
const isRedisConnected = () => isConnected;

module.exports = { connectRedis, getRedis, isRedisConnected };

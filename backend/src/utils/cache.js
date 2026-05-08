const { getRedis } = require('../config/redis');

const DEFAULT_TTL = 300; // 5 minutes

const cache = {
  async get(key) {
    const redis = getRedis();
    if (!redis) return null;
    try {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  async set(key, value, ttl = DEFAULT_TTL) {
    const redis = getRedis();
    if (!redis) return;
    try {
      await redis.setEx(key, ttl, JSON.stringify(value));
    } catch {
      // Cache failure is non-fatal
    }
  },

  async del(key) {
    const redis = getRedis();
    if (!redis) return;
    try {
      await redis.del(key);
    } catch {
      // Cache failure is non-fatal
    }
  },

  async delPattern(pattern) {
    const redis = getRedis();
    if (!redis) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(keys);
    } catch {
      // Cache failure is non-fatal
    }
  }
};

module.exports = cache;

const redis = require('../init_db').redis

const CACHE_TYPE = {
    SUGGESTIONS_USERS:  'suggestions:users',
    SUGGESTIONS_JOBS:   'suggestions:jobs',
    JOB_RECOMMENDATIONS: 'job:recommendations',
    SAME_SCHOOL:    'same:school',
    SAME_COMPANY:   'same:company',
    FEED_PUBLIC:    'feed:public',
    FEED_NETWORK:   'feed:network',
    JOBS_ALL:       'jobs:all',
    JOBS_APPLIED:   'jobs:applied',
    PROFILE:        'profile:user',
    MUTUAL_CONNECTIONS: 'mutual:connections',
    POST_CONTENT:       'post:content',
    NOTIFICATION_UNREAD_COUNT: 'notif:unread'
};

// TTL configurations per cache type (in seconds)
const CACHE_CONFIG = {
    [CACHE_TYPE.SUGGESTIONS_USERS]:   { prefix: 'suggestions:users',  ttl: 60 },
    [CACHE_TYPE.SUGGESTIONS_JOBS]:    { prefix: 'suggestions:jobs',   ttl: 120 },
    [CACHE_TYPE.JOB_RECOMMENDATIONS]: { prefix: 'job:recommendations', ttl: 172800 }, // 2 days
    [CACHE_TYPE.SAME_SCHOOL]:         { prefix: 'same:school',         ttl: 60 },
    [CACHE_TYPE.SAME_COMPANY]:        { prefix: 'same:company',        ttl: 60 },
    [CACHE_TYPE.FEED_PUBLIC]:         { prefix: 'feed:public',         ttl: 180 },
    [CACHE_TYPE.FEED_NETWORK]:        { prefix: 'feed:network',        ttl: 300 },
    [CACHE_TYPE.JOBS_ALL]:            { prefix: 'jobs:all',            ttl: 300 },
    [CACHE_TYPE.JOBS_APPLIED]:        { prefix: 'jobs:applied',        ttl: 300 },
    [CACHE_TYPE.PROFILE]:             { prefix: 'profile:user',        ttl: 600 },
    [CACHE_TYPE.MUTUAL_CONNECTIONS]:  { prefix: 'mutual:connections',  ttl: 120 },
    [CACHE_TYPE.POST_CONTENT]:        { prefix: 'post:content',        ttl: 60 },
    [CACHE_TYPE.NOTIFICATION_UNREAD_COUNT]: { prefix: 'notif:unread',  ttl: 1800 }, // 30 mins
};

/**
 * Get cache configuration (prefix and TTL) for a given type
 */
const get_key_n_ttl = (type) => {
    const config = CACHE_CONFIG[type];
    if (!config) {
        console.warn(`Cache type ${type} not found, using default TTL of 60s`);
        return { prefix: type, ttl: 60 };
    }
    return config;
};

/**
 * Build a unique cache key from type, object_id, and optional params
 */

const makeParamStr = (params) => {
    if (!params || Object.keys(params).length === 0) return '';
    // turn {range:"0-5", limit:10} into ":range:0-5:limit:10"
    return ':' + Object.entries(params)
        .map(([k, v]) => `${k}:${v}`)
        .join(':');
};

const getCacheKey = (type, object_id, params = {}) => {
    const config = get_key_n_ttl(type);
    return `${config.prefix}:${object_id}${makeParamStr(params)}`;
};

// FIX #8: Singleflight-style locking to prevent cache stampede
const pendingRebuilds = new Map();

const getCache = async (type, object_id, params = {}) => {
    try {
        const client = redis.getClient();
        if (!client) return null;
        
        const cacheKey = getCacheKey(type, object_id, params);
        const cached = await client.get(cacheKey);
        
        if (cached) return JSON.parse(cached);
        return null;
    } catch (err) {
        console.error(`Error retrieving cache for ${type}:`, err);
        return null;
    }
};

/**
 * Store data in Redis cache
 */
const storeCache = async (type, object_id, value, params = {}) => {
    try {
        const client = redis.getClient();
        if (!client) return false;
        const cacheKey = getCacheKey(type, object_id, params);
        const config = get_key_n_ttl(type);
        const ttl = config.ttl;
        await client.setex(cacheKey, ttl, JSON.stringify(value));
        return true;
    } catch (err) {
        console.error(`Error storing cache for ${type}:`, err);
        return false;
    }
};

/**
 * Invalidate/delete a specific cache key
 */
const invalidateCache = async (type, object_id, params = {}) => {
    try {
        const client = redis.getClient();
        if (!client) return false;
        const cacheKey = getCacheKey(type, object_id, params);
        await client.del(cacheKey);
        return true;
    } catch (err) {
        console.error(`Error invalidating cache for ${type}:`, err);
        return false;
    }
};

/**
 * Non-blocking iterative SCAN to find all keys matching a pattern.
 */
const scanKeys = async (client, pattern) => {
    const keys = [];
    let cursor = '0';
    do {
        const [newCursor, found] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = newCursor;
        keys.push(...found);
    } while (cursor !== '0');
    return keys;
};

const invalidateUserCaches = async (object_id) => {
    try {
        const client = redis.getClient();
        if (!client) return false;
        const pattern = `*:${object_id}*`;
        const keys = await scanKeys(client, pattern);
        if (keys.length > 0) await client.del(...keys);
        return true;
    } catch (err) {
        console.error('Error invalidating user caches:', err);
        return false;
    }
};

const invalidateAll = async (type) => {
    try {
        const client = redis.getClient();
        if (!client) return false;
        const config = get_key_n_ttl(type);
        const pattern = `${config.prefix}:*`;
        const keys = await scanKeys(client, pattern);
        if (keys.length > 0) await client.del(...keys);
        return true;
    } catch (err) {
        console.error(`Error invalidating all cache for ${type}:`, err);
        return false;
    }
};

/**
 * pass value to a function and set value will be null if there is no cache
 * function return null if we we don't want to update if it not exsits
 */
const updateCacheWithFn = async ({type, object_id, transformFn, params = {}, keepTTL = false}) => {
    try {
        const client = redis.getClient();
        if (!client) {
            return null;
        }

        const cacheKey = getCacheKey(type, object_id, params);

        // Get existing value
        const cached = await client.get(cacheKey);
        let currentValue = null;

        if (cached) {
            try {
                currentValue = JSON.parse(cached);
            } catch (e) {
                currentValue = cached; // fallback if not JSON
            }
        }

        // Apply transformation
        const newValue = await transformFn(currentValue);
        if (newValue === null) {
            return null;
        }

        if (keepTTL) {
            // Redis >= 6.0 supports KEEPTTL
            await client.set(cacheKey, JSON.stringify(newValue), 'KEEPTTL');
        } else {
            const config = get_key_n_ttl(type);
            const ttl = config.ttl;
            await client.setex(cacheKey, ttl, JSON.stringify(newValue));
        }

        return newValue;
    } catch (err) {
        console.error(`Error updating cache with function for ${type}:`, err);
        return null;
    }
};

module.exports = {
    CACHE_TYPE,
    get_key_n_ttl,
    getCacheKey,
    getCache,
    storeCache,
    invalidateCache,
    invalidateUserCaches,
    invalidateAll,
    updateCacheWithFn,
};
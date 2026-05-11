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
    POST_CONTENT:       'post:content'
};

// TTL configurations per cache type (in seconds)
const CACHE_CONFIG = {
    [CACHE_TYPE.SUGGESTIONS_USERS]:     { prefix: 'suggestions:users',  ttl: 60 },      // 1 min - highly dynamic
    [CACHE_TYPE.SUGGESTIONS_JOBS]:      { prefix: 'suggestions:jobs',   ttl: 120 },       // 2 min
    [CACHE_TYPE.JOB_RECOMMENDATIONS]:   { prefix: 'job:recommendations', ttl: 172800  }, // 2 days
    [CACHE_TYPE.SAME_SCHOOL]:           { prefix: 'same:school',    ttl: 60 },                  // 1 min
    [CACHE_TYPE.SAME_COMPANY]:          { prefix: 'same:company',   ttl: 60 },                  // 1 min
    [CACHE_TYPE.FEED_PUBLIC]:           { prefix: 'feed:public',    ttl: 180 },                 // 3 min - frequent refresh
    [CACHE_TYPE.FEED_NETWORK]:          { prefix: 'feed:network',   ttl: 300 },                 // 5 min
    [CACHE_TYPE.JOBS_ALL]:              { prefix: 'jobs:all',       ttl: 300 },                       // 5 min - less dynamic
    [CACHE_TYPE.JOBS_APPLIED]:          { prefix: 'jobs:applied',   ttl: 300 },               // 5 min
    [CACHE_TYPE.PROFILE]:               { prefix: 'profile:user',   ttl: 600 },                    // 10 min - static data
    [CACHE_TYPE.MUTUAL_CONNECTIONS]:    { prefix: 'mutual:connections', ttl: 120 },  // 2 min
    [CACHE_TYPE.POST_CONTENT]:          { prefix: 'post:content', ttl: 60 },  // 1 min
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

/**
 * Get data from Redis cache
 * @param {string} type - Cache type from CACHE_TYPE
 * @param {string|number} object_id - User ID
 * @param {object} params - Optional parameters for key building
 * @returns {Promise<any|null>} - Cached data or null if not found
 */
const getCache = async (type, object_id, params = {}) => {
    try {
        const client = redis.getClient();
        if (!client) {
            return null;
        }
        const cacheKey = getCacheKey(type, object_id, params);
        const cached = await client.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    } catch (err) {
        console.error(`Error retrieving cache for ${type}:`, err);
        return null;
    }
};

/**
 * Store data in Redis cache
 * @param {string} type - Cache type from CACHE_TYPE
 * @param {string|number} object_id - User ID
 * @param {any} value - Data to cache (will be JSON stringified)
 * @param {object} params - Optional parameters for key building
 * @returns {Promise<boolean>} - true if stored, false otherwise
 */
const storeCache = async (type, object_id, value, params = {}) => {
    try {
        const client = redis.getClient();
        if (!client) {
            return false;
        }
        
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
        if (!client) {
            return false;
        }
        
        const cacheKey = getCacheKey(type, object_id, params);
        await client.del(cacheKey);
        return true;
    } catch (err) {
        console.error(`Error invalidating cache for ${type}:`, err);
        return false;
    }
};

/**
 * Invalidate all caches for a specific user (by pattern)
 */
const invalidateUserCaches = async (object_id) => {
    try {
        const client = redis.getClient();
        if (!client) {
            return false;
        }
        
        const pattern = `*:${object_id}*`;
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(...keys);
        }
        return true;
    } catch (err) {
        console.error(`Error invalidating user caches:`, err);
        return false;
    }
};

const invalidateCacheByType = async (type) => {
    try {
        const client = redis.getClient();
        if (!client) return false;
        const config = get_key_n_ttl(type);
        const keys = await client.keys(`${config.prefix}:*`);
        if (keys.length > 0) await client.del(...keys);
        return true;
    } catch (err) {
        console.error(`Error invalidating cache by type ${type}:`, err);
        return false;
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
    invalidateCacheByType,
};
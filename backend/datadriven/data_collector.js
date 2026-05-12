const { produce, consume } = require('./kafka');
const Neo4j = require('../query/neo4j');
const cache = require('../query/cache');
const NotificationQuery = require('../query/notification');
const UserQuery = require('../query/user');
const mongosh = require('../init_db').mongosh;
const JobQuery = require('../query/jobs')
const socketUtil = require('./socket');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const USER_CREATED = 'user.created';
const POSTS_TOPIC = 'posts.events';
const JOBS_TOPIC = 'jobs.events';
const USERS_TOPIC = 'users.events';

const USERS_EVENT_TYPE = {
  FOLLOW: 'FOLLOW',
  CONNECT: 'CONNECT',
};

const POSTS_EVENT_TYPE = {
  CREATE: 'CREATE',
  LIKE: 'LIKE',
  UNLIKE: 'UNLIKE',
  COMMENT_ADD: 'COMMENT_ADD',
  COMMENT_DEL: 'COMMENT_DEL',
  SHARE: 'SHARE',
};

const JOBS_EVENT_TYPE = {
  CREATE: 'CREATE',
  APPLY: 'APPLY',
};

async function publishEvent(topic, payload) {
  return produce(topic, payload);
}

async function publishUserCreated(payload) {
  return publishEvent(USER_CREATED, payload);
}

async function publishUserEvent(eventType, payload) {
  return publishEvent(USERS_TOPIC, { type: eventType, ...payload });
}

async function publishPostEvent(eventType, payload) {
  return publishEvent(POSTS_TOPIC, { type: eventType, ...payload });
}

async function publishJobEvent(eventType, payload) {
  return publishEvent(JOBS_TOPIC, { type: eventType, ...payload });
}

async function consumeUserCreated(payload) {
  await Neo4j.createUser(
    payload.user_id,
    payload.full_name,
    payload.headline || '',
    payload.location || ''
  );
}

async function IncreaseNotify(user_id) {
  return cache.updateCacheWithFn({
    type: cache.CACHE_TYPE.NOTIFICATION_UNREAD_COUNT,
    object_id: user_id,
    transformFn: async (val) => (val === null) ? await NotificationQuery.getUnreadCount(user_id) : val + 1,
    keepTTL: false, // refesh cache timeout
  })
}


async function handlePostNotification(type, payload) {
  try {
    const post = await mongosh.Post.findById(payload.post_id);
    if (!post) return;
    
    const ownerId = post.author.id;
    if (ownerId === String(payload.user_id)) return;
    
    const userResult = await UserQuery.getUserProfileById(payload.user_id);
    if (userResult.rowCount === 0) return;
    const user = userResult.rows[0];
    
    const actor = {
      id: String(payload.user_id),
      name: user.full_name,
      avatar: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0a66c2&color=fff`
    };
    
    const entity = {
      id: payload.post_id,
      type: "POST",
      preview: post.content.text ? post.content.text.substring(0, 50) : "A post"
    };
    
    const result = await NotificationQuery.createNotification(ownerId, actor, type, entity);
    const unreadCount = await IncreaseNotify(ownerId);
    socketUtil.emitNotification(ownerId, result, unreadCount);
  } catch (err) {
    console.error(`Error handling post notification for ${payload.post_id}:`, err.message);
    // Simple 1-time retry
    try {
      await sleep(200);
      // Re-fetch only what's needed or just log the intent
      const post = await mongosh.Post.findById(payload.post_id);
      if (post) {
        await NotificationQuery.createNotification(post.author.id, null, type, { id: payload.post_id, type: "POST" });
        await IncreaseNotify(post.author.id);
      }
    } catch (retryErr) {
      console.error("Final notification failure:", retryErr.message);
    }
  }
}
async function handleUserNotification(type, payload) {
  try {
    const ownerId = payload.target_user_id;
    if (ownerId === String(payload.user_id)) return;
    
    const userResult = await UserQuery.getUserProfileById(payload.user_id);
    if (userResult.rowCount === 0) return;
    const user = userResult.rows[0];
    
    const actor = {
      id: String(payload.user_id),
      name: user.full_name,
      avatar: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0a66c2&color=fff`
    };
    
    const entity = {
      id: payload.target_user_id,
      type: "USER",
      preview: `Profile of ${user.full_name}`
    };
    
    const result = await NotificationQuery.createNotification(ownerId, actor, type, entity);
    const unreadCount = await IncreaseNotify(ownerId)
    socketUtil.emitNotification(ownerId, result, unreadCount);
  } catch (err) {
    console.error("Error handling user notification:", err);
  }
}

async function handleJobNotification(type, payload) {
  try {
    const job_id = payload.job_id;
    const record = await JobQuery.GetByIds([job_id]);
    if (record.rowCount === 0) return;
    const job = record.rows[0];
    const ownerId = job.recruiter_id;
    if (ownerId === String(payload.user_id)) return;
    
    const userResult = await UserQuery.getUserProfileById(payload.user_id);
    if (userResult.rowCount === 0) return;
    const user = userResult.rows[0];
    
    const actor = {
      id: String(payload.user_id),
      name: user.full_name,
      avatar: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0a66c2&color=fff`
    };
    
    const entity = {
      id: payload.job_id,
      type: "JOB",
      preview: `${user.full_name} applied to ${job.title}`
    };
    const result = await NotificationQuery.createNotification(ownerId, actor, type, entity);
    const unreadCount = await IncreaseNotify(ownerId)
    socketUtil.emitNotification(ownerId, result, unreadCount);
  } catch (err) {
    console.error("Error handling user notification:", err);
  }
}

async function handleJobNotificationCreate(type, payload) {
  try{
    const records = await Neo4j.getSuggestUsersForJob(payload.job_id);
    if (!records) return;
    const user_ids = records.map(r => r.toObject().user_id);
    const userResult = await UserQuery.getUserProfileById(payload.recruiter_id);
    if (userResult.rowCount === 0) return;
    const user = userResult.rows[0];

    const entity = {
      id: payload.job_id,
      // FIX #1 companion: Align with corrected enum — 'JOBS' was removed from
      // notificationEntitySchema; all job entities must now use singular 'JOB'.
      type: "JOB",
      preview: `${user.full_name} is hiring ${payload.title}`
    };

    const actor = {
        id: String(user.id),
        name: user.full_name,
        avatar: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0a66c2&color=fff`
      };

    for(let id of user_ids){
      if (id === user.id) continue;
      const result = await NotificationQuery.createNotification(String(id), actor, type, entity);
      const unreadCount = await IncreaseNotify(String(id));
      socketUtil.emitNotification(id, result, unreadCount);
    }
  }catch (err) {
    console.error("Error handling user notification:", err);
  }
}

async function consumeUsersEvents(payload) {
  try {
    switch (payload.type) {
      case USERS_EVENT_TYPE.FOLLOW:
        await Neo4j.createFollow(payload.user_id, payload.target_user_id);
        await cache.invalidateCache(cache.CACHE_TYPE.FEED_NETWORK, payload.user_id);
        await handleUserNotification("USER_FOLLOW", payload);
        break;
      case USERS_EVENT_TYPE.CONNECT:
        await Neo4j.createConnect(payload.user_id, payload.target_user_id);
        await cache.invalidateCache(cache.CACHE_TYPE.FEED_NETWORK, payload.user_id);
        await handleUserNotification("CONNECTION_REQUEST", payload);
        break;
    }
  } catch (err) {
    console.log("consumeUsersEvents error", err);
  }
}
async function consumePostsEvents(payload) {
  try{
  switch (payload.type) {
    case POSTS_EVENT_TYPE.CREATE:
      await Neo4j.authored(payload.author_id, payload.post_id);
      break;
    case POSTS_EVENT_TYPE.LIKE:
      await Neo4j.likePost(payload.user_id, payload.post_id);
      await handlePostNotification("POST_LIKE", payload);
      break;
    case POSTS_EVENT_TYPE.UNLIKE:
      await Neo4j.unlikePost(payload.user_id, payload.post_id);
      break;
    case POSTS_EVENT_TYPE.COMMENT_ADD:
      await Neo4j.commentPost(payload.user_id, payload.post_id, payload.comment_id);
      await handlePostNotification("POST_COMMENT", payload);
      break;
    case POSTS_EVENT_TYPE.COMMENT_DEL:
      await Neo4j.deleteComment(payload.user_id, payload.post_id, payload.comment_id);
      break;
    case POSTS_EVENT_TYPE.SHARE:
      await Neo4j.sharePost(payload.user_id, payload.post_id);
      await handlePostNotification("POST_SHARE", payload);
      break;
  }
  } catch(err){
    console.log("consumePostsEvents error", err);
  }
}

async function notifyMatchingUsers(jobId, recruiterId, title, users) {
  if (!users || users.length === 0) return;
  const userResult = await UserQuery.getUserProfileById(recruiterId);
  if (userResult.rowCount === 0) return;
  const recruiter = userResult.rows[0];

  const actor = {
    id: String(recruiter.id),
    name: recruiter.full_name,
    avatar: recruiter.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(recruiter.full_name)}&background=0a66c2&color=fff`
  };
  const entity = { id: jobId, type: "JOB", preview: `${recruiter.full_name} is hiring ${title}` };

  for (let id of users) {
    if (String(id) === String(recruiterId)) continue;
    const result = await NotificationQuery.createNotification(String(id), actor, "COMPANY_HIRING", entity);
    const unreadCount = await IncreaseNotify(String(id));
    socketUtil.emitNotification(id, result, unreadCount);
  }
}

async function UpdateMatchingUserCaches(userIds, job_id) {
  if (!userIds || userIds.length === 0) return;
  const now = new Date();
  const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`
  await Promise.allSettled(
    userIds.map(uid => cache.updateCacheWithFn({
      type:cache.CACHE_TYPE.JOB_RECOMMENDATIONS, 
      object_id: uid,
      transformFn: (val) => (val === null) ? null : [ job_id,...val],
      params: {date:dateStr},
      keepTTL: true,
    }))
  );
}

async function consumeJobsEvents(payload) {
  try {
    switch (payload.type) {
      case JOBS_EVENT_TYPE.CREATE: {
        await Neo4j.createJobNode(payload.job_id, payload.title, payload.company_id, payload.salary_range);
        await sleep(200); // Simple MVP hack for eventual consistency
        
        const records = await Neo4j.getSuggestUsersForJob(payload.job_id);
        if (records && records.length > 0) {
          const matchingUserIds = records.map(r => r.toObject().user_id);
          await notifyMatchingUsers(payload.job_id, payload.recruiter_id, payload.title, matchingUserIds);
          await UpdateMatchingUserCaches(matchingUserIds, payload.job_id);
        }
        break;
      }
      case JOBS_EVENT_TYPE.APPLY:
        await Neo4j.applyJob(payload.user_id, payload.job_id);
        await handleJobNotification("JOB_APPLY", payload);
        break;
    }
  } catch (err) {
    console.error("consumeJobsEvents error", err);
  }
}

async function startDataCollectors() {
  console.log('Starting Kafka data collectors...');
  await consume({
    [USER_CREATED]: consumeUserCreated,
    [POSTS_TOPIC]: consumePostsEvents,
    [JOBS_TOPIC]: consumeJobsEvents,
    [USERS_TOPIC]: consumeUsersEvents,
  });
}

module.exports = {
  publishEvent,
  publishUserCreated,
  publishPostEvent,
  publishJobEvent,
  publishUserEvent,
  POSTS_EVENT_TYPE,
  JOBS_EVENT_TYPE,
  USERS_EVENT_TYPE,
  startDataCollectors,
};

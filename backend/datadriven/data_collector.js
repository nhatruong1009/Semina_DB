const { produce, consume } = require('./kafka');
const Neo4j = require('../query/neo4j');
const cache = require('../query/cache');
const NotificationQuery = require('../query/notification');
const UserQuery = require('../query/user');
const mongosh = require('../init_db').mongosh;

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
  console.log(`consumeUserCreated ${payload.user_id} ${payload.email}`);
  await Neo4j.createUser(
    payload.user_id,
    payload.full_name,
    payload.headline || '',
    payload.location || ''
  );
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
    
    await NotificationQuery.createNotification(ownerId, actor, type, entity);
  } catch (err) {
    console.error("Error handling notification:", err);
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
    
    await NotificationQuery.createNotification(ownerId, actor, type, entity);
  } catch (err) {
    console.error("Error handling user notification:", err);
  }
}

async function consumeUsersEvents(payload) {
  try {
    switch (payload.type) {
      case USERS_EVENT_TYPE.FOLLOW:
        await Neo4j.createFollow(payload.user_id, payload.target_user_id);
        await handleUserNotification("USER_FOLLOW", payload);
        break;
      case USERS_EVENT_TYPE.CONNECT:
        await Neo4j.createConnect(payload.user_id, payload.target_user_id);
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

async function consumeJobsEvents(payload) {
  try{
  switch (payload.type) {
    case JOBS_EVENT_TYPE.CREATE:
      await Neo4j.createJobNode(payload.job_id, payload.title, payload.company_id, payload.salary_range);
      cache.invalidateCacheByType(cache.CACHE_TYPE.JOB_RECOMMENDATIONS)
        .catch(e => console.error('cache invalidate job recs:', e));
      break;
    case JOBS_EVENT_TYPE.APPLY:
      await Neo4j.applyJob(payload.user_id, payload.job_id);
      break;
  }
  } catch(err){
    console.log("consumeJobsEvents error", err);
  }
}

async function startDataCollectors() {
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

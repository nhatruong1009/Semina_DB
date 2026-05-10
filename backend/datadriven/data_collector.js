const { produce, consume } = require('./kafka');
const Neo4j = require('../query/neo4j');

const USER_CREATED = 'user.created';
const POSTS_TOPIC = 'posts.events';
const JOBS_TOPIC = 'jobs.events';

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


async function consumePostsEvents(payload) {
  try{
  switch (payload.type) {
    case POSTS_EVENT_TYPE.CREATE:
      await Neo4j.authored(payload.author_id, payload.post_id);
      break;
    case POSTS_EVENT_TYPE.LIKE:
      await Neo4j.likePost(payload.user_id, payload.post_id);
      break;
    case POSTS_EVENT_TYPE.UNLIKE:
      await Neo4j.unlikePost(payload.user_id, payload.post_id);
      break;
    case POSTS_EVENT_TYPE.COMMENT_ADD:
      await Neo4j.commentPost(payload.user_id, payload.post_id, payload.comment_id);
      break;
    case POSTS_EVENT_TYPE.COMMENT_DEL:
      break;
    case POSTS_EVENT_TYPE.SHARE:
      await Neo4j.sharePost(payload.user_id, payload.post_id);
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
      await Neo4j.createJobNode(
          payload.job_id, 
          payload.title, 
          payload.company_id,
          payload.recruiter_id,
        );
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
  });
}

module.exports = {
  publishEvent,
  publishUserCreated,
  publishPostEvent,
  publishJobEvent,
  POSTS_EVENT_TYPE,
  JOBS_EVENT_TYPE,
  startDataCollectors,
};

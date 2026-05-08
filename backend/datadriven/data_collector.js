const { produce, consume, subscribe } = require('./kafka');
const Neo4j = require('../query/neo4j');

const USER_CREATED = 'user.created';
const POSTS_EVENT = 'posts.event';

const POSTS_EVENT_TYPE = Object.freeze({
  CREATE: 'CREATE',
  LIKE:   'LIKE',
  UNLIKE: 'UNLIKE',
  COMMENT_ADD: 'COMMENT_ADD',
  COMMENT_DEL: 'COMMENT_DEL',
  SHARE: 'SHARE'
});

async function publishEvent(topic, payload) {
  // TODO: validate event payload and enrich with metadata before sending.
  return produce(topic, payload);
}

async function publishPostsEvent(type, payload) {
  return publishEvent(POSTS_EVENT, {...payload, type: type})
}

async function consumePostsEvents(payload) {
  console.log(`consumePostsEvents ${payload.type} ${payload.post_id} ${payload.author.id}`)
  function handlePostEvent(eventType, payload) {
    switch (payload.type) {
      // please create neo4j interaction here
      case POSTS_EVENT_TYPE.CREATE:
        // Creating post
        break;
      case POSTS_EVENT_TYPE.LIKE:
        // User liked post
        break;
      case POSTS_EVENT_TYPE.UNLIKE:
        // User unliked post
        break;
      case POSTS_EVENT_TYPE.COMMENT_ADD:
        // Adding comment
        break;
      case POSTS_EVENT_TYPE.COMMENT_DEL:
        // Deleting comment
        break;
      case POSTS_EVENT_TYPE.SHARE:
        // Sharing post
        break;
      default:
        // Unknown event type
    }
  }
}


// implement
async function publishUserCreated(payload) {
  return publishEvent(USER_CREATED, payload);
}

async function consumeUserCreated(payload) {
  console.log(`consumeUserCreated ${payload.user_id} ${payload.email}`);
  await Neo4j.createUser(payload.user_id, payload.full_name, payload.headline || '');
}

// setup
async function startDataCollectors() {
  await subscribe(USER_CREATED, consumeUserCreated);
  await subscribe(POSTS_EVENT, consumePostsEvents);

  await consume();
}

module.exports = {
  POSTS_EVENT_TYPE,

  publishEvent,
  startDataCollectors,
  publishUserCreated,
  publishPostsEvent,
};

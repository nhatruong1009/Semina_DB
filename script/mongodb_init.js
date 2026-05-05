/* =========================================
   MONGODB INIT SCRIPT - LINKEDIN CLONE
   Run with: mongosh mongodb_init.js
========================================= */

// 1. USE DATABASE
use linkedin_clone;


/* =========================================
   2. CREATE COLLECTION: POSTS
========================================= */
db.createCollection("posts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["author", "content"],
      properties: {
        author: {
          bsonType: "object",
          required: ["id", "name"],
          properties: {
            id: { bsonType: "string" },
            name: { bsonType: "string" },
            headline: { bsonType: "string" }
          }
        },

        content: {
          bsonType: "object",
          properties: {
            text: { bsonType: "string" },

            media: {
              bsonType: "array",
              items: {
                bsonType: "object",
                properties: {
                  type: {
                    enum: ["image", "video"]
                  },
                  url: { bsonType: "string" }
                }
              }
            },

            link_preview: {
              bsonType: "object",
              properties: {
                title: { bsonType: "string" },
                url: { bsonType: "string" }
              }
            }
          }
        },

        stats: {
          bsonType: "object",
          properties: {
            likes: { bsonType: "int" },
            comments: { bsonType: "int" },
            shares: { bsonType: "int" }
          }
        },

        visibility: {
          enum: ["public", "connections"]
        },

        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  }
});

// INDEX
db.posts.createIndex({ "author.id": 1 });
db.posts.createIndex({ created_at: -1 });



/* =========================================
   3. CREATE COLLECTION: COMMENTS
========================================= */
db.createCollection("comments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["post_id", "user", "content"],
      properties: {
        post_id: { bsonType: "string" },

        user: {
          bsonType: "object",
          required: ["id"],
          properties: {
            id: { bsonType: "string" },
            name: { bsonType: "string" }
          }
        },

        content: { bsonType: "string" },

        created_at: { bsonType: "date" }
      }
    }
  }
});

// INDEX
db.comments.createIndex({ post_id: 1 });



/* =========================================
   4. CREATE COLLECTION: REACTIONS
========================================= */
db.createCollection("reactions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["post_id", "user_id", "type"],
      properties: {
        post_id: { bsonType: "string" },
        user_id: { bsonType: "string" },

        type: {
          enum: ["like", "share"]
        },

        created_at: { bsonType: "date" }
      }
    }
  }
});

// INDEX
db.reactions.createIndex({ post_id: 1 });
db.reactions.createIndex({ user_id: 1 });

// UNIQUE CONSTRAINT (no duplicate like)
db.reactions.createIndex(
  { post_id: 1, user_id: 1 },
  { unique: true }
);



/* =========================================
   5. SAMPLE DATA (OPTIONAL TEST)
========================================= */

db.posts.insertOne({
  author: {
    id: "U01",
    name: "Vinh",
    headline: "Backend Developer"
  },
  content: {
    text: "Hello MongoDB 🚀",
    media: []
  },
  stats: {
    likes: 0,
    comments: 0,
    shares: 0
  },
  visibility: "public",
  created_at: new Date(),
  updated_at: new Date()
});


print("✅ MongoDB schema initialized successfully!");
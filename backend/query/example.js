// ==============================
// IMPORT CONNECTIONS
// ==============================
const psql = require('../init_db').psql;
const mongosh = require('../init_db').mongosh;
const neo4jsh = require('../init_db').neo4j_client;

const { Types } = require('mongoose');


// ==============================
// POSTGRESQL
// ==============================

const createUser = (email, password_hash, full_name, headline) => {
    return psql.Query(
        `
    WITH new_user AS (
      INSERT INTO users (email, password_hash) 
      VALUES ($1, $2)
      RETURNING id
    )
    INSERT INTO profiles (user_id, full_name, headline) 
    SELECT id, $3, $4 FROM new_user
    RETURNING *;
    `,
        [email, password_hash, full_name, headline]
    );
};

const getUser = (email) => {
    return psql.Query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
    );
};


// ==============================
// MONGODB (POSTS / COMMENTS / REACTIONS)
// ==============================

const GetContent = async (user_id) => {
    try {
        return await mongosh.Post
            .find({ "author.id": user_id })
            .sort({ created_at: -1 });
    } catch (err) {
        throw err;
    }
};


// 🔹 CREATE POST
const SaveContent = async (content) => {
    try {
        if (!content.author || !content.author.id) {
            throw new Error("Invalid author data");
        }

        const newPost = new mongosh.Post({
            ...content,
            stats: {
                likes: 0,
                comments: 0,
                shares: 0
            },
            created_at: new Date(),
            updated_at: new Date()
        });

        return await newPost.save();
    } catch (err) {
        throw err;
    }
};


// 🔹 ADD COMMENT
const AddComment = async (post_id, user, content) => {
    try {
        const objectId = new Types.ObjectId(post_id); // Dùng cái này để Update Post

        const comment = await mongosh.Comment.create({
            post_id: post_id, // TRUYỀN STRING VÀO ĐÂY (Để khớp với Validator)
            user: user,
            content: content,
            created_at: new Date()
        });

        await mongosh.Post.updateOne(
            { _id: objectId }, // Dùng ObjectId ở đây là đúng
            { $inc: { "stats.comments": 1 } }
        );
        return comment;
    } catch (err) {
        console.error("Lỗi tại AddComment:", err);
        throw err;
    }
};




// 🔹 LIKE POST (SAFE - NO DUPLICATE)
const LikePost = async (post_id, user_id) => {
    try {
        const objectId = new Types.ObjectId(post_id);
        await mongosh.Post.updateOne(
            { _id: objectId },
            { $addToSet: { likes: user_id } }
        );
        return true;
    } catch (err) {
        throw err;
    }
};


// 🔹 UNLIKE POST (SAFE)
const UnlikePost = async (post_id, user_id) => {
    try {
        const objectId = new Types.ObjectId(post_id);

        const deleted = await mongosh.Reaction.deleteOne({
            post_id,
            user_id
        });

        if (deleted.deletedCount > 0) {
            await mongosh.Post.updateOne(
                { _id: objectId },
                { $inc: { "stats.likes": -1 } }
            );
        }

        return true;
    } catch (err) {
        throw err;
    }
};


// 🔹 DELETE POST (CASCADE DELETE)
const DeletePost = async (post_id) => {
    try {
        const objectId = new Types.ObjectId(post_id);

        const result = await mongosh.Post.deleteOne({
            _id: objectId
        });

        if (result.deletedCount === 0) {
            throw new Error("Post not found");
        }

        await mongosh.Comment.deleteMany({ post_id });
        await mongosh.Reaction.deleteMany({ post_id });

        return true;
    } catch (err) {
        throw err;
    }
};


// ==============================
// NEO4J (SAFE QUERY)
// ==============================

const getUserWorks = (user_id) => {

    const id = user_id || "";
    return neo4jsh.Query(
        `MATCH (u:User {user_id: $user_id})-[:WORKS_AT]->(c:Company) RETURN u.name AS user, c.name AS company;`,
        { user_id: id }
    );
};


// ==============================
// EXPORT
// ==============================

module.exports = {
    createUser,
    getUser,
    GetContent,
    SaveContent,
    AddComment,
    LikePost,
    UnlikePost,
    DeletePost,
    getUserWorks,
};
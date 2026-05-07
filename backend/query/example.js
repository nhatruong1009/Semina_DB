// import connection
const psql = require('../init_db').psql
const mongosh = require('../init_db').mongosh
const neo4jsh = require('../init_db').neo4j_client

// example for query from postgrresql
const createUser = (email, password_hash, full_name, headline) => {
    return psql.Query(`
      WITH new_user AS (
        INSERT INTO users (email, password_hash) 
        VALUES ($1, $2)
        RETURNING id
      )
      INSERT INTO profiles (user_id, full_name, headline) 
      SELECT id, $3, $4 FROM new_user
      RETURNING *;`, [email, password_hash, full_name, headline]);
}

const getUser = (email) => {
    return psql.Query('SELECT * FROM "users" WHERE email = $1', [email]);
}

// example for query from mongodb
const GetContent = (user_id) => {
    return mongosh.Post.find({ "author.id": user_id });
}
// example for saving
const SaveContent = (content) => {
    const newPost = mongosh.Post(content)
    return newPost.save()
}
// .. find other about update, delete by yourself pls


// example for query from neo4j
const getUserWorks = (user_id) => {
    return neo4jsh.Query(`
			MATCH (u:User {user_id: '${user_id}'})-[:WORKS_AT]->(c:Company)
			RETURN u.name AS user, c.name AS company;
			`)
}

// example for export functions.
module.exports = {
    createUser,
    getUser,
    GetContent,
    SaveContent,
    getUserWorks,
}
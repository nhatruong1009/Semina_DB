const {
  createUser,
  getUser,
  GetContent,
  SaveContent,
  getUserWorks,
} = require('../query/example');
const conn = require("../init_db");
require('dotenv').config();

// helper to poll until ready
const waitUntilReady = async () => {
  while (!(conn.mongosh.isReady() &&
           conn.psql.isReady() &&
           conn.neo4j_client.isReady())) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

beforeAll(async () => {
  // wait for all connections before any test runs
  await waitUntilReady();
});

afterAll(async () => {
  // close connections when tests finish
  await conn.mongosh.disconnect?.();
  await conn.psql.disconnect?.();
  await conn.neo4j_client.close?.();
});

describe("Database functions", () => {
  test("createUser should insert a user and profile", async () => {
    const result = await createUser("test@example.com", "hashed_pass", "Nguyễn Văn A", "Data Engineer");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].full_name).toBe("Nguyễn Văn A");
  });

  test("getUser should return user by email", async () => {
    const result = await getUser("test@example.com");
    expect(len(result)).toBeGreaterThan(0);
    expect(result[0].email).toBe("test@example.com");
  });

  test("SaveContent should save a post", async () => {
    const content = {
      author: { id: "123", name: "Nguyễn Văn A" },
      content: { text: "Hello world!" },
      visibility: "public"
    };
    const post = await SaveContent(content);
    expect(post.content.text).toBe("Hello world!");
  });

  test("GetContent should return posts by author", async () => {
    const posts = await GetContent("123");
    expect(Array.isArray(posts)).toBe(true);
  });

  test("getUserWorks should query Neo4j", async () => {
    const records = await getUserWorks("UUID_USER_1");
    expect(Array.isArray(records)).toBe(true);
  });
});

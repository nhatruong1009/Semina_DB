const mockQuery = jest.fn();

jest.mock('../data/neo4j', () => ({ Query: mockQuery }));

const Neo4j = require('../query/neo4j');

beforeEach(() => {
  mockQuery.mockClear();
  mockQuery.mockResolvedValue([]);
});

describe('Neo4j query functions', () => {
  test('createUser calls query with userId as string', async () => {
    await Neo4j.createUser(123, 'Nguyen Van A', 'Developer', 'HCM');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [, params] = mockQuery.mock.calls[0];
    expect(params.userId).toBe('123'); // must be string
    expect(params.name).toBe('Nguyen Van A');
  });

  test('getSuggestions passes correct userId', async () => {
    await Neo4j.getSuggestions('u001');
    const [, params] = mockQuery.mock.calls[0];
    expect(params.userId).toBe('u001');
  });

  test('getMutualConnections passes both userIds', async () => {
    await Neo4j.getMutualConnections('u001', 'u002');
    const [, params] = mockQuery.mock.calls[0];
    expect(params.userId1).toBe('u001');
    expect(params.userId2).toBe('u002');
  });

  test('createConnect passes correct params and includes connected_at', async () => {
    await Neo4j.createConnect('u001', 'u002');
    const [, params] = mockQuery.mock.calls[0];
    expect(params.userId1).toBe('u001');
    expect(params.userId2).toBe('u002');
    expect(params.now).toBeDefined();
  });

  test('createFollow passes correct followerId and followeeId', async () => {
    await Neo4j.createFollow('u001', 'u002');
    const [, params] = mockQuery.mock.calls[0];
    expect(params.followerId).toBe('u001');
    expect(params.followeeId).toBe('u002');
  });
});

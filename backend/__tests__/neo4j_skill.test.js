const mockQuery = jest.fn();
jest.mock('../data/neo4j', () => ({ Query: mockQuery }));

const Neo4j = require('../query/neo4j');

beforeEach(() => {
  mockQuery.mockClear();
  mockQuery.mockResolvedValue([]);
});

describe('getBestJobsForUser', () => {
  test('passes userId as string and limit as int', async () => {
    await Neo4j.getBestJobsForUser(42, 5);
    const [query, params] = mockQuery.mock.calls[0];
    expect(params.userId).toBe('42');
    expect(params.limit).toBe(5);
    // Cypher must start from all OPEN jobs so results are never empty
    expect(query).toMatch(/MATCH \(j:Job\) WHERE j\.status = 'OPEN'/);
    expect(query).toMatch(/OPTIONAL MATCH/);
  });

  test('default limit is 10', async () => {
    await Neo4j.getBestJobsForUser('u1');
    const [, params] = mockQuery.mock.calls[0];
    expect(params.limit).toBe(10);
  });
});

describe('getBestUsersForJob', () => {
  test('passes jobId as string and limit as int', async () => {
    await Neo4j.getBestUsersForJob('job-123', 3);
    const [, params] = mockQuery.mock.calls[0];
    expect(params.jobId).toBe('job-123');
    expect(params.limit).toBe(3);
  });

  test('default limit is 10', async () => {
    await Neo4j.getBestUsersForJob('job-123');
    const [, params] = mockQuery.mock.calls[0];
    expect(params.limit).toBe(10);
  });
});

describe('getJobRecommendations', () => {
  test('passes correct userId', async () => {
    await Neo4j.getJobRecommendations('u99');
    const [, params] = mockQuery.mock.calls[0];
    expect(params.userId).toBe('u99');
  });
});

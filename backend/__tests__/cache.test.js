const mockGet    = jest.fn();
const mockSetex  = jest.fn();
const mockDel    = jest.fn();
const mockKeys   = jest.fn();
const mockClient = { get: mockGet, setex: mockSetex, del: mockDel, keys: mockKeys };

jest.mock('../init_db', () => ({
  redis: { getClient: () => mockClient },
}));

const cache = require('../query/cache');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('cache helpers', () => {
  test('getCache returns parsed value on hit', async () => {
    mockGet.mockResolvedValue(JSON.stringify({ id: 1 }));
    const result = await cache.getCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, 'u1');
    expect(result).toEqual({ id: 1 });
    expect(mockGet).toHaveBeenCalledWith('job:recommendations:u1');
  });

  test('getCache returns null on miss', async () => {
    mockGet.mockResolvedValue(null);
    const result = await cache.getCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, 'u1');
    expect(result).toBeNull();
  });

  test('storeCache calls setex with correct key and TTL', async () => {
    mockSetex.mockResolvedValue('OK');
    await cache.storeCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, 'u1', [{ job_id: 'j1' }]);
    expect(mockSetex).toHaveBeenCalledWith(
      'job:recommendations:u1',
      172800,
      JSON.stringify([{ job_id: 'j1' }])
    );
  });

  test('invalidateCache deletes the correct key', async () => {
    mockDel.mockResolvedValue(1);
    await cache.invalidateCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, 'u1');
    expect(mockDel).toHaveBeenCalledWith('job:recommendations:u1');
  });

  test('invalidateCache for multiple users only touches their keys', async () => {
    mockDel.mockResolvedValue(1);
    await cache.invalidateCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, 'u1');
    await cache.invalidateCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, 'u2');
    expect(mockDel).toHaveBeenCalledTimes(2);
    expect(mockDel).toHaveBeenCalledWith('job:recommendations:u1');
    expect(mockDel).toHaveBeenCalledWith('job:recommendations:u2');
  });
});

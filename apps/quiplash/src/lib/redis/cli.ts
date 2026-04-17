import { env } from '$env/dynamic/private';
import { createClient, type RedisClientType } from '@games/redis/redis';

export interface RedisConfig {
	url: string;
	password?: string;
	tls?: boolean;
}

// Singleton client + connection promise to prevent concurrent .connect() calls
let redisClient: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;
// App-specific key namespacing
export function getKey(key: string): string {
	if (!key) throw new Error('Missing key');
	return `quiplash:${key}`;
}

export async function getRedisClient(config2?: RedisConfig): Promise<RedisClientType> {
	const config = config2 || {
		url: env.REDIS_URL,
		password: env.REDIS_PASSWORD
		// tls: true
	};

	if (redisClient && redisClient.isOpen) return redisClient;
	if (connectPromise) return connectPromise;

	if (!redisClient) {
		redisClient = createClient(config) as RedisClientType;

		redisClient.on('error', (err) => {
			console.error('Redis Client Error', err);
		});
	}

	connectPromise = redisClient
		.connect()
		.then(() => redisClient as RedisClientType)
		.finally(() => {
			connectPromise = null;
		});

	return connectPromise;
}

/**
 * Set a value in Redis.
 * @param key The key to set.
 * @param value The value to set.
 * @param ttl The time-to-live for the key (in seconds).
 * @returns The result of the set command.
 */
export async function set(key: string, value: string, ttl?: number): Promise<string | null> {
	if (!key) throw new Error('Key is required');
	if (!redisClient) throw new Error('Redis client is not initialized');
	if (ttl && ttl > 0) {
		return redisClient.set(key, value, { EX: ttl });
	}
	return redisClient.set(key, value);
}

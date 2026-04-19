import { createClient, type RedisClientType } from "@games/redis/redis";

export interface RedisConfig {
    url: string;
    password?: string;
    tls?: boolean;
}

// Singleton client + connection promise to prevent concurrent .connect() calls
let redisClient: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;
let _config: RedisConfig | null = null;

export function initRedis(config: RedisConfig) {
    _config = config;
}

export async function getRedisClient(): Promise<RedisClientType> {
    if (!_config)
        throw new Error("Redis not initialized — call initRedis() first");

    if (redisClient && redisClient.isOpen) return redisClient;
    if (connectPromise) return connectPromise;

    if (!redisClient) {
        redisClient = createClient(_config) as RedisClientType;

        redisClient.on("error", (err) => {
            console.error("Redis Client Error", err);
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
export async function set(
    key: string,
    value: string,
    ttl?: number,
): Promise<string | null> {
    if (!key) throw new Error("Key is required");
    const redisClient = await getRedisClient();
    if (!redisClient) throw new Error("Redis client is not initialized");
    if (ttl && ttl > 0) {
        return redisClient.set(key, value, { EX: ttl });
    }
    return redisClient.set(key, value);
}

/**
 * Get a value from Redis.
 * @param key The key to retrieve.
 * @returns The value associated with the key.
 */
export async function get(key: string): Promise<string | null> {
    if (!key) throw new Error("Key is required");
    const redisClient = await getRedisClient();
    if (!redisClient) throw new Error("Redis client is not initialized");
    return redisClient.get(key);
}

/**
 * Get a JSON value from Redis.
 * @param key The key to retrieve.
 * @returns The JSON value associated with the key.
 */
export async function getJSON<T>(key: string): Promise<T | null> {
    const raw = await get(key);
    if (raw == null) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/**
 * Set a JSON value in Redis.
 * @param key The key to set.
 * @param value The JSON value to set.
 * @param ttl The time-to-live for the key (in seconds).
 * @returns The result of the set command.
 */
export async function setJSON<T>(
    key: string,
    value: T,
    ttl?: number,
): Promise<string | null> {
    const jsonString = JSON.stringify(value);
    return set(key, jsonString, ttl);
}

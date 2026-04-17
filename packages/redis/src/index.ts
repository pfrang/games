import { createClient, type RedisClientType } from "redis";

export interface RedisConfig {
    url: string;
    password?: string;
    tls?: boolean;
}

export type Logger = {
    error: (message: string, err?: unknown) => void;
};

// Singleton client + connection promise to prevent concurrent .connect() calls
let redisClient: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

export async function getRedisClient(
    config: RedisConfig,
    logger?: Logger,
): Promise<RedisClientType> {
    if (redisClient && redisClient.isOpen) return redisClient;
    if (connectPromise) return connectPromise;

    if (!redisClient) {
        redisClient = createClient({
            url: config.url,
            password: config.password,
            socket: { tls: true },
        }) as RedisClientType;

        redisClient.on("error", (err) => {
            logger?.error("Redis Client Error", err);
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

export async function closeRedis(): Promise<void> {
    if (redisClient && redisClient.isOpen) {
        try {
            await redisClient.quit();
        } catch {
            redisClient.destroy();
        } finally {
            redisClient = null;
        }
    }
}

/**
 * Get a value from Redis.
 * @param key The key to retrieve.
 * @returns The value associated with the key.
 */
export async function get(key: string): Promise<string | null> {
    if (!key) throw new Error("Key is required");
    if (!redisClient) throw new Error("Redis client is not initialized");
    return redisClient.get(key);
}

/**
 * Set a value in Redis.
 * @param key The key to set.
 * @param value The value to set.
 * @param ttl The time-to-live for the key (in seconds).
 * @returns The result of the set command.
 */
export async function set(
    client: RedisClientType,
    key: string,
    value: string,
    ttl?: number,
): Promise<string | null> {
    if (!key) throw new Error("Key is required");
    if (!client) throw new Error("Redis client is not initialized");
    if (ttl && ttl > 0) {
        return client.set(key, value, {
            expiration: { type: "EX", value: ttl },
        });
    }
    return client.set(key, value);
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

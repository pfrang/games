import { type RedisClientType } from "redis";

export interface RedisConfig {
    url: string;
    password?: string;
    tls?: boolean;
}

/**
 * Get a value from Redis.
 * @param key The key to retrieve.
 * @returns The value associated with the key.
 */
export async function get(
    client: RedisClientType,
    key: string,
): Promise<string | null> {
    if (!key) throw new Error("Key is required");
    if (!client) throw new Error("Redis client is not initialized");
    return client.get(key);
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
export async function getJSON<T>(
    client: RedisClientType,
    key: string,
): Promise<T | null> {
    const raw = await get(client, key);
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
    client: RedisClientType,
    key: string,
    value: T,
    ttl?: number,
): Promise<string | null> {
    const jsonString = JSON.stringify(value);
    return set(client, key, jsonString, ttl);
}

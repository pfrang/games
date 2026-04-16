import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

if (!env.REDIS_URL) throw new Error('REDIS_URL is not set');

// Two separate clients — Redis doesn't allow a connection
// to both publish and subscribe at the same time
export const publisher = new Redis(env.REDIS_URL);
export const subscriber = new Redis(env.REDIS_URL);

import { spawn } from "child_process";

const {
    REDISHOST = "localhost",
    REDISPORT = "6379",
    REDIS_PASSWORD,
} = process.env;

const args = ["-h", REDISHOST, "-p", REDISPORT];
if (REDIS_PASSWORD) args.push("-a", REDIS_PASSWORD);

spawn("redis-cli", args, { stdio: "inherit", shell: true });

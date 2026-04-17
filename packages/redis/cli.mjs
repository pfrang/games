import { spawn } from "child_process";

const {
    REDISHOST = "localhost",
    REDISPORT = "6379",
    REDISPASSWORD,
} = process.env;

const args = ["-h", REDISHOST, "-p", REDISPORT];
if (REDISPASSWORD) args.push("-a", REDISPASSWORD);

spawn("redis-cli", args, { stdio: "inherit", shell: true });

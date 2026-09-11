import Redis from "ioredis";

const redisClientSingleton = () => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  client.on("error", (err) => {
    console.error("[SabQuick Redis Error]:", err);
  });

  return client;
};

declare const globalThis: {
  redisGlobal: ReturnType<typeof redisClientSingleton> | undefined;
} & typeof global;

export const redis = globalThis.redisGlobal ?? redisClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.redisGlobal = redis;
}

export default redis;

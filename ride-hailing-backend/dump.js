const Redis = require("ioredis"); const fs = require("fs"); const redis = new Redis(); async function dump() { const keys = await redis.keys("*"); let out = "# Redis Data Dump

"; for (const k of keys) { const type = await redis.type(k); out += `## Key: ${k} (Type: ${type})
`; if (type === "string") out += await redis.get(k) + "
"; if (type === "set") out += (await redis.smembers(k)).join(", ") + "
"; if (type === "zset") out += (await redis.zrange(k, 0, -1, "WITHSCORES")).join(", ") + "
"; out += "
"; } fs.writeFileSync("/Users/shikhagupta/.gemini/antigravity-ide/brain/7a8e4db5-7f5f-49c8-a29e-26ac3f46a6c1/scratch/redis_data.md", out); process.exit(0); } dump();

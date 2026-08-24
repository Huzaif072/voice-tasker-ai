import { getCached } from "../lib/redis/ratelimit.ts";

if (typeof getCached !== "function") throw new Error("Expected cache helper to be available");
console.log("PASS: performance test harness can import the cache layer.");

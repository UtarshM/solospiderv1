import { Queue } from "bullmq";
import Redis from "ioredis";
import { getServerEnv } from "@/server/env";

export interface CrawlJobData {
  project_id: string;
  website: string;
  max_pages?: number;
  run_id?: string;
}

export interface PromptScanJobData {
  project_id: string;
  brand_name: string;
  models: string[];
  competitors?: string[];
  prompt_ids?: string[];
  run_id?: string;
}

export interface ScoringJobData {
  project_id: string;
  brand_name: string;
}

export interface PublishJobData {
  post_id: string;
}

const globalForQueues = globalThis as unknown as {
  solospiderRedis?: Redis;
  solospiderQueues?: {
    crawlQueue: Queue<CrawlJobData>;
    promptScanQueue: Queue<PromptScanJobData>;
    scoringQueue: Queue<ScoringJobData>;
    publishQueue: Queue<PublishJobData>;
  };
};

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

export function getRedisConnection() {
  if (!globalForQueues.solospiderRedis) {
    const env = getServerEnv();
    globalForQueues.solospiderRedis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    });
  }

  return globalForQueues.solospiderRedis;
}

export function getQueues() {
  if (!globalForQueues.solospiderQueues) {
    const connection = getRedisConnection();
    globalForQueues.solospiderQueues = {
      crawlQueue: new Queue<CrawlJobData>("crawl", { connection, defaultJobOptions }),
      promptScanQueue: new Queue<PromptScanJobData>("prompt-scan", {
        connection,
        defaultJobOptions: { ...defaultJobOptions, attempts: 2 },
      }),
      scoringQueue: new Queue<ScoringJobData>("scoring", { connection, defaultJobOptions }),
      publishQueue: new Queue<PublishJobData>("publish", { connection, defaultJobOptions }),
    };
  }

  return globalForQueues.solospiderQueues;
}

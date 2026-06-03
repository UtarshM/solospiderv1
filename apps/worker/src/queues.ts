import { Queue } from "bullmq";
import { redis } from "./config.js";

// ── Job payload types ───────────────────────────────────────────────────────

export interface CrawlJobData {
  project_id: string;
  website: string;
  max_pages?: number;
  run_id?: string;         // crawl_runs.id if already created
}

export interface PromptScanJobData {
  project_id: string;
  brand_name: string;
  models: string[];
  competitors?: string[];
  prompt_ids?: string[];   // null = all active prompts
  run_id?: string;         // prompt_scan_runs.id if already created
}

export interface ScoringJobData {
  project_id: string;
  brand_name: string;
}

export interface PublishJobData {
  post_id: string;
}

// ── Queue definitions ────────────────────────────────────────────────────────

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail:     { count: 50 },
};

export const crawlQueue = new Queue<CrawlJobData>("crawl", {
  connection: redis,
  defaultJobOptions,
});

export const promptScanQueue = new Queue<PromptScanJobData>("prompt-scan", {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2, // AI calls can be expensive, limit retries
  },
});

export const scoringQueue = new Queue<ScoringJobData>("scoring", {
  connection: redis,
  defaultJobOptions,
});

export const publishQueue = new Queue<PublishJobData>("publish", {
  connection: redis,
  defaultJobOptions,
});

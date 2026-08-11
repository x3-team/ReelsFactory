import { AnalysisStatus } from "@prisma/client";
import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";

import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

type AnalysisJobData = {
  analysisId: string;
  userId: string;
  clientAccountId?: string | null;
};

const QUEUE_NAME = "reelsfactory-analysis";

type MemoryJob = {
  id: string;
  data: AnalysisJobData;
  status: "waiting" | "active" | "completed" | "failed";
  error?: string;
};

const memoryJobs = new Map<string, MemoryJob>();
let memoryWorkerStarted = false;
let bullQueue: Queue<AnalysisJobData> | null = null;
let bullWorker: Worker<AnalysisJobData> | null = null;
let redisConnection: IORedis | null = null;

function redisUrl() {
  return process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || "";
}

function shouldUseBullMq() {
  return Boolean(redisUrl());
}

function getRedis() {
  if (!redisConnection) {
    redisConnection = new IORedis(redisUrl(), {
      maxRetriesPerRequest: null,
    });
  }
  return redisConnection;
}

async function processAnalysisJob(data: AnalysisJobData) {
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new Error("User not found");

  let workingUser: User = user;
  if (data.clientAccountId) {
    const client = await prisma.clientAccount.findFirst({
      where: { id: data.clientAccountId, agencyUserId: user.id },
    });
    if (!client) throw new Error("Client account not found");
    workingUser = {
      ...user,
      socialHandle: client.socialHandle,
      platform: client.platform,
    };
  }

  await prisma.profileAnalysis.update({
    where: { id: data.analysisId },
    data: {
      status: AnalysisStatus.SCRAPING,
      clientAccountId: data.clientAccountId || null,
    },
  });

  // runAnalysisPipeline creates its own analysis row — we need a variant that uses existing id.
  // For queue we call a dedicated runner that updates the pre-created analysis.
  const { runAnalysisForExisting } = await import(
    "@/lib/pipeline/run-analysis"
  );
  return runAnalysisForExisting(workingUser, data.analysisId);
}

function ensureMemoryWorker() {
  if (memoryWorkerStarted) return;
  memoryWorkerStarted = true;

  const tick = async () => {
    const next = Array.from(memoryJobs.values()).find(
      (j) => j.status === "waiting",
    );
    if (!next) {
      setTimeout(() => void tick(), 250);
      return;
    }
    next.status = "active";
    try {
      await processAnalysisJob(next.data);
      next.status = "completed";
    } catch (error) {
      next.status = "failed";
      next.error = error instanceof Error ? error.message : "Job failed";
      await prisma.profileAnalysis.update({
        where: { id: next.data.analysisId },
        data: {
          status: AnalysisStatus.FAILED,
          errorMessage: next.error,
        },
      });
    }
    setTimeout(() => void tick(), 50);
  };
  void tick();
}

function ensureBull() {
  if (bullQueue && bullWorker) return;
  const connection = getRedis();
  bullQueue = new Queue<AnalysisJobData>(QUEUE_NAME, { connection });
  bullWorker = new Worker<AnalysisJobData>(
    QUEUE_NAME,
    async (job: Job<AnalysisJobData>) => processAnalysisJob(job.data),
    { connection, concurrency: 1 },
  );
  bullWorker.on("failed", async (job, err) => {
    if (!job) return;
    await prisma.profileAnalysis.update({
      where: { id: job.data.analysisId },
      data: {
        status: AnalysisStatus.FAILED,
        errorMessage: err.message,
      },
    });
  });
}

export async function enqueueAnalysis(input: {
  userId: string;
  socialHandle: string;
  platform: string;
  clientAccountId?: string | null;
}) {
  const analysis = await prisma.profileAnalysis.create({
    data: {
      userId: input.userId,
      socialHandle: input.socialHandle,
      platform: input.platform,
      clientAccountId: input.clientAccountId || null,
      status: AnalysisStatus.QUEUED,
    },
  });

  const payload: AnalysisJobData = {
    analysisId: analysis.id,
    userId: input.userId,
    clientAccountId: input.clientAccountId,
  };

  if (shouldUseBullMq()) {
    ensureBull();
    const job = await bullQueue!.add("analyze", payload, {
      removeOnComplete: 100,
      removeOnFail: 100,
    });
    await prisma.profileAnalysis.update({
      where: { id: analysis.id },
      data: { jobId: String(job.id) },
    });
    return { analysisId: analysis.id, jobId: String(job.id), mode: "bullmq" as const };
  }

  ensureMemoryWorker();
  const jobId = `mem_${analysis.id}`;
  memoryJobs.set(jobId, {
    id: jobId,
    data: payload,
    status: "waiting",
  });
  await prisma.profileAnalysis.update({
    where: { id: analysis.id },
    data: { jobId },
  });
  return { analysisId: analysis.id, jobId, mode: "memory" as const };
}

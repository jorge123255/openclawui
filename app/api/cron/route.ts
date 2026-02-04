import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runOpenClaw(args: string): Promise<any> {
  try {
    const { stdout } = await execAsync(`/usr/local/bin/clawdbot ${args}`, {
      timeout: 30000,
      env: { ...process.env, HOME: process.env.HOME || '/Users/gszulc' },
    });
    return JSON.parse(stdout);
  } catch (e: any) {
    console.error('OpenClaw error:', e.message);
    throw e;
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, jobId, job, patch } = body;

  try {
    switch (action) {
      case "list":
        return await listJobs();
      case "add":
        return await addJob(job);
      case "update":
        return await updateJob(jobId, patch);
      case "remove":
        return await removeJob(jobId);
      case "run":
        return await runJob(jobId);
      case "status":
        return await getStatus();
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

async function listJobs() {
  try {
    const result = await runOpenClaw('cron list --all --json');
    return NextResponse.json({
      success: true,
      jobs: result.jobs || result || [],
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      jobs: [],
      error: e.message,
    });
  }
}

async function addJob(job: any) {
  if (!job) {
    return NextResponse.json({ error: "Job definition required" }, { status: 400 });
  }

  try {
    // Build the cron add command
    const args: string[] = ['cron', 'add'];
    
    if (job.name) args.push(`--name "${job.name}"`);
    
    // Schedule
    if (job.schedule.kind === 'every') {
      args.push(`--every ${job.schedule.everyMs}ms`);
    } else if (job.schedule.kind === 'cron') {
      args.push(`--cron "${job.schedule.expr}"`);
      if (job.schedule.tz) args.push(`--tz "${job.schedule.tz}"`);
    } else if (job.schedule.kind === 'at') {
      args.push(`--at ${job.schedule.atMs}`);
    }
    
    // Target
    args.push(`--target ${job.sessionTarget}`);
    
    // Payload
    if (job.payload.kind === 'systemEvent') {
      args.push(`--text '${job.payload.text.replace(/'/g, "'\\''")}'`);
    } else if (job.payload.kind === 'agentTurn') {
      args.push(`--agent-message '${job.payload.message.replace(/'/g, "'\\''")}'`);
    }
    
    args.push('--json');
    
    const result = await runOpenClaw(args.join(' '));
    return NextResponse.json({
      success: true,
      jobId: result.jobId || result.id,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

async function updateJob(jobId: string, patch: any) {
  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  try {
    // For enable/disable
    if (patch.enabled !== undefined) {
      const action = patch.enabled ? 'enable' : 'disable';
      await runOpenClaw(`cron ${action} "${jobId}" --json`);
    }
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

async function removeJob(jobId: string) {
  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  try {
    await runOpenClaw(`cron remove "${jobId}" --json`);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

async function runJob(jobId: string) {
  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  try {
    await runOpenClaw(`cron run "${jobId}" --json`);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

async function getStatus() {
  try {
    const result = await runOpenClaw('cron status --json');
    return NextResponse.json({
      success: true,
      status: result,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

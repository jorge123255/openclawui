import { NextRequest } from "next/server";
import { execSync } from "child_process";

const GATEWAY_URL = "http://192.168.1.75:18789";
const GATEWAY_TOKEN = "e590d5dafc405a8f7cf9b024be074aff6f11405f99b8d8c2";

interface AgentEvent {
  type: "agent_start" | "agent_message" | "test_run" | "code_update" | "round" | "complete" | "error" | "agent_thinking";
  agent?: string;
  role?: string;
  action?: string;
  content?: string;
  code?: string;
  tests?: string;
  testResults?: { passed: number; failed: number; total: number; output: string };
  round?: number;
  finalCode?: string;
  plan?: string;
}

function sendEvent(controller: ReadableStreamDefaultController, event: AgentEvent) {
  const data = JSON.stringify(event);
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
}

function callModel(model: string, messages: { role: string; content: string }[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      messages,
      stream: false,
      max_tokens: 16000,
    });

    const tmpFile = `/tmp/multi-agent-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
    require("fs").writeFileSync(tmpFile, payload);

    const { spawn } = require("child_process");
    const curl = spawn("curl", [
      "-s", "-X", "POST",
      `${GATEWAY_URL}/v1/chat/completions`,
      "-H", "Content-Type: application/json",
      "-H", `Authorization: Bearer ${GATEWAY_TOKEN}`,
      "-d", `@${tmpFile}`,
    ]);

    let stdout = "";
    let stderr = "";
    curl.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    curl.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    const timeout = setTimeout(() => {
      curl.kill();
      reject(new Error("Model call timed out after 120s"));
    }, 120000);

    curl.on("close", (code: number) => {
      clearTimeout(timeout);
      try { require("fs").unlinkSync(tmpFile); } catch {}
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed.choices?.[0]?.message?.content || "");
      } catch {
        reject(new Error(`Failed to parse response: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

function extractCodeBlock(text: string, label?: string): string {
  // Try to find a specific labeled code block first
  if (label) {
    const labelRegex = new RegExp("```(?:" + label + ")\\n([\\s\\S]*?)```", "i");
    const match = text.match(labelRegex);
    if (match) return match[1].trim();
  }
  // Fall back to any code block
  const blocks: RegExpExecArray[] = [];
  const fallbackRe = /```(?:\w+)?\n([\s\S]*?)```/g;
  let fm;
  while ((fm = fallbackRe.exec(text)) !== null) blocks.push(fm);
  if (blocks.length > 0) {
    // Return the longest block (likely the main code)
    return blocks.reduce((a, b) => a[1].length > b[1].length ? a : b)[1].trim();
  }
  return "";
}

function extractAllCodeBlocks(text: string): { label: string; code: string }[] {
  const blocks: { label: string; code: string }[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ label: match[1] || "code", code: match[2].trim() });
  }
  return blocks;
}

function runTests(code: string, tests: string, language: string): { passed: number; failed: number; total: number; output: string } {
  const tmpDir = `/tmp/multi-agent-test-${Date.now()}`;
  try {
    execSync(`mkdir -p ${tmpDir}`);

    let cmd = "";
    if (language === "python" || language === "py") {
      // Write code + tests together
      const combined = `${code}\n\n${tests}`;
      require("fs").writeFileSync(`${tmpDir}/test_main.py`, combined);
      // Auto-install pytest if needed, then run
      cmd = `cd ${tmpDir} && /usr/bin/python3 -m pip install --user --break-system-packages pytest -q 2>/dev/null; /usr/bin/python3 -m pytest test_main.py -v --tb=short 2>&1 || /usr/bin/python3 test_main.py 2>&1`;
    } else if (language === "javascript" || language === "js" || language === "typescript" || language === "ts") {
      require("fs").writeFileSync(`${tmpDir}/code.js`, code);
      require("fs").writeFileSync(`${tmpDir}/test.js`, `const code = require('./code');\n${tests}`);
      cmd = `cd ${tmpDir} && /usr/local/bin/node test.js 2>&1`;
    } else {
      // Default: try running as a script
      require("fs").writeFileSync(`${tmpDir}/code.py`, `${code}\n\n${tests}`);
      cmd = `cd ${tmpDir} && /usr/bin/python3 code.py 2>&1`;
    }

    let output = "";
    try {
      output = execSync(cmd, { timeout: 30000, maxBuffer: 1024 * 1024 }).toString();
    } catch (e: any) {
      output = e.stdout?.toString() || e.stderr?.toString() || e.message || "Test execution failed";
    }

    // Parse test results from output
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const errorMatch = output.match(/(\d+)\s+error/);

    const passed = parseInt(passedMatch?.[1] || "0");
    const failed = parseInt(failedMatch?.[1] || "0") + parseInt(errorMatch?.[1] || "0");

    // If no pytest output, check for assertion errors / plain python
    if (!passedMatch && !failedMatch) {
      const hasError = output.match(/AssertionError|AssertionError|Traceback|Error:|FAIL/gi);
      const hasPass = output.match(/all tests passed|tests passed|OK/gi);
      
      if (hasPass && !hasError) {
        return { passed: 1, failed: 0, total: 1, output: output };
      }
      if (hasError) {
        const errorCount = (output.match(/AssertionError|AssertionError/gi) || []).length || 1;
        return { passed: 0, failed: errorCount, total: errorCount, output };
      }
      // If clean exit (no errors), assume passed
      if (!output.includes("Error") && !output.includes("Traceback") && !output.includes("FAIL") && !output.includes("assert False")) {
        return { passed: 1, failed: 0, total: 1, output: output || "All tests passed (no errors detected)" };
      }
    }

    const total = passed + failed || 1;
    return { passed, failed, total, output };
  } finally {
    try { execSync(`rm -rf ${tmpDir}`); } catch {}
  }
}

async function tddMode(task: string, controller: ReadableStreamDefaultController, models: { boss: string; worker: string }) {
  const MAX_ROUNDS = 5;
  let currentCode = "";
  let currentTests = "";
  let language = "python";
  let lastTestOutput = "";
  let lastBossFeedback = "";

  // === ROUND 0: Boss plans + writes tests ===
  sendEvent(controller, { type: "agent_start", agent: "boss", role: "Boss", action: "planning" });
  sendEvent(controller, { type: "agent_thinking", agent: "boss", content: "Breaking down the task and designing the architecture..." });

  const planPrompt = `You are a senior software architect and team lead. A developer has asked you to build something. Your job is:

1. Analyze the task
2. Break it down into a clear plan (bullet points)
3. Choose the best language (default: Python unless the task requires otherwise)
4. Write comprehensive tests FIRST (TDD style)

The tests should cover:
- Happy path
- Edge cases
- Error handling
- Input validation

IMPORTANT: Write tests using ONLY simple assert statements and try/except blocks. Do NOT use pytest, unittest, or any test framework — just plain Python with assert.
Example test format:
\`\`\`python
# Tests
assert my_func(1) == 2, "should return 2"
try:
    my_func(None)
    assert False, "should have raised ValueError"
except ValueError:
    pass
print("All tests passed!")
\`\`\`

Put your plan in a section called "## Plan"
Put your tests in a single code block labeled with the language (e.g. \`\`\`python)
At the end, add a line: "Language: <language>"

Task: ${task}`;

  const planResponse = await callModel(models.boss, [
    { role: "system", content: "You are a meticulous tech lead who writes tests first. Be thorough but practical." },
    { role: "user", content: planPrompt },
  ]);

  sendEvent(controller, { type: "agent_message", agent: "boss", role: "Boss", action: "plan", content: planResponse });

  // Extract tests and language
  currentTests = extractCodeBlock(planResponse);
  const langMatch = planResponse.match(/Language:\s*(\w+)/i);
  if (langMatch) language = langMatch[1].toLowerCase();

  if (!currentTests) {
    sendEvent(controller, { type: "error", content: "Boss failed to generate tests. Aborting." });
    sendEvent(controller, { type: "complete", finalCode: "" });
    return;
  }

  sendEvent(controller, { type: "code_update", agent: "boss", code: currentTests, tests: currentTests });

  // === ROUNDS 1-N: Worker codes, tests run, Boss reviews ===
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    sendEvent(controller, { type: "round", round });

    // Worker writes/fixes code
    sendEvent(controller, { type: "agent_start", agent: "worker", role: "Worker", action: round === 1 ? "coding" : "fixing" });
    sendEvent(controller, { type: "agent_thinking", agent: "worker", content: round === 1 ? "Implementing the solution..." : "Fixing the issues..." });

    const workerMessages: { role: string; content: string }[] = [
      {
        role: "system",
        content: `You are an expert ${language} developer. Write clean, well-structured code. Return ONLY the implementation code in a single \`\`\`${language} code block. Do not include tests. Do not include explanations outside the code block.`,
      },
    ];

    if (round === 1) {
      workerMessages.push({
        role: "user",
        content: `Implement the following. Your code must pass these tests:\n\n## Task\n${task}\n\n## Tests to pass\n\`\`\`${language}\n${currentTests}\n\`\`\`\n\nWrite the implementation code only.`,
      });
    } else {
      workerMessages.push({
        role: "user",
        content: `Your previous implementation had issues. Fix the code.\n\n## Task\n${task}\n\n## Your previous code\n\`\`\`${language}\n${currentCode}\n\`\`\`\n\n## Tests (must pass)\n\`\`\`${language}\n${currentTests}\n\`\`\`\n\n## Test output (failures)\n\`\`\`\n${lastTestOutput}\n\`\`\`\n\n## Boss feedback\n${lastBossFeedback}\n\nFix the code. Return ONLY the corrected implementation in a single code block.`,
      });
    }

    const workerResponse = await callModel(models.worker, workerMessages);
    sendEvent(controller, { type: "agent_message", agent: "worker", role: "Worker", action: "code", content: workerResponse });

    const newCode = extractCodeBlock(workerResponse, language);
    if (newCode) {
      currentCode = newCode;
      sendEvent(controller, { type: "code_update", agent: "worker", code: currentCode });
    }

    // Run tests
    sendEvent(controller, { type: "agent_start", agent: "tester", role: "Tests", action: "running" });
    const testResults = runTests(currentCode, currentTests, language);
    sendEvent(controller, { type: "test_run", testResults });

    lastTestOutput = testResults.output;
    lastBossFeedback = "";

    if (testResults.failed === 0 && testResults.passed > 0) {
      // Tests pass! Boss reviews code quality
      sendEvent(controller, { type: "agent_start", agent: "boss", role: "Boss", action: "reviewing" });
      sendEvent(controller, { type: "agent_thinking", agent: "boss", content: "All tests pass. Reviewing code quality..." });

      const reviewResponse = await callModel(models.boss, [
        {
          role: "system",
          content: "You are a senior code reviewer. Be thorough but fair. If the code is good, approve it.",
        },
        {
          role: "user",
          content: `All tests pass. Review this implementation for code quality, security, and best practices.\n\n## Task\n${task}\n\n## Implementation\n\`\`\`${language}\n${currentCode}\n\`\`\`\n\n## Tests (all passing)\n\`\`\`${language}\n${currentTests}\n\`\`\`\n\nIf the code is ready to ship, start your response with "APPROVED ✅"\nIf it needs changes, start with "NEEDS WORK ❌" and explain what to fix.`,
        },
      ]);

      sendEvent(controller, { type: "agent_message", agent: "boss", role: "Boss", action: "review", content: reviewResponse });

      if (reviewResponse.includes("APPROVED") || reviewResponse.includes("✅")) {
        // Done!
        sendEvent(controller, { type: "complete", finalCode: currentCode, tests: currentTests, plan: planResponse });
        return;
      } else {
        lastBossFeedback = reviewResponse;
      }
    } else {
      // Tests failed - Boss gives guidance
      sendEvent(controller, { type: "agent_start", agent: "boss", role: "Boss", action: "diagnosing" });
      sendEvent(controller, { type: "agent_thinking", agent: "boss", content: "Tests failed. Analyzing what went wrong..." });

      const diagResponse = await callModel(models.boss, [
        {
          role: "system",
          content: "You are a senior developer helping a junior fix their code. Be specific about what's wrong and how to fix it. Keep it concise.",
        },
        {
          role: "user",
          content: `Tests failed. Diagnose the issue and give specific fix instructions.\n\n## Code\n\`\`\`${language}\n${currentCode}\n\`\`\`\n\n## Tests\n\`\`\`${language}\n${currentTests}\n\`\`\`\n\n## Test output\n\`\`\`\n${testResults.output}\n\`\`\`\n\nGive specific, actionable feedback. What exactly needs to change?`,
        },
      ]);

      sendEvent(controller, { type: "agent_message", agent: "boss", role: "Boss", action: "feedback", content: diagResponse });
      lastBossFeedback = diagResponse;
    }
  }

  // Max rounds reached
  sendEvent(controller, { type: "error", content: `Max rounds (${MAX_ROUNDS}) reached. Here's the best version so far.` });
  sendEvent(controller, { type: "complete", finalCode: currentCode, tests: currentTests });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { task, mode = "tdd", models: modelConfig } = body;

  if (!task) {
    return new Response(JSON.stringify({ error: "No task provided" }), { status: 400 });
  }

  const models = {
    boss: modelConfig?.boss || "anthropic/claude-opus-4-6",
    worker: modelConfig?.worker || "openai-codex/gpt-5.3-codex",
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (mode === "tdd") {
          await tddMode(task, controller, models);
        } else {
          sendEvent(controller, { type: "error", content: `Unknown mode: ${mode}` });
        }
      } catch (err: any) {
        sendEvent(controller, { type: "error", content: err.message || "Unknown error" });
      } finally {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

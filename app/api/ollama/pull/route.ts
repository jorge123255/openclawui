import { NextResponse } from "next/server";
import { execSync, spawn } from "child_process";

export async function POST(request: Request) {
  const { url, model } = await request.json();
  const ollamaUrl = url || "http://localhost:11434";

  if (!model) {
    return NextResponse.json({ error: "Model name required" }, { status: 400 });
  }

  try {
    // Use curl with streaming - pipe through line by line
    const json = JSON.stringify({ name: model, stream: true }).replace(/'/g, "'\\''");
    const child = spawn("curl", [
      "-s", "-X", "POST",
      "-H", "Content-Type: application/json",
      "-d", JSON.stringify({ name: model, stream: true }),
      `${ollamaUrl}/api/pull`,
    ]);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        let buffer = "";

        child.stdout.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            } catch {}
          }
        });

        child.stderr.on("data", () => {});

        child.on("close", (code) => {
          if (buffer.trim()) {
            try {
              const data = JSON.parse(buffer);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            } catch {}
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        });

        child.on("error", (err) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

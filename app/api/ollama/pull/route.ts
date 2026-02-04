import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { url, model } = await request.json();
  const ollamaUrl = url || "http://localhost:11434";

  if (!model) {
    return NextResponse.json({ error: "Model name required" }, { status: 400 });
  }

  try {
    // Start pull with streaming enabled
    const res = await fetch(`${ollamaUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model, stream: true }),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error: error || "Failed to start pull" }, { status: 500 });
    }

    // Stream the response back to the client
    const reader = res.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "No response body" }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Ollama sends newline-delimited JSON
            const text = decoder.decode(value);
            const lines = text.split("\n").filter(Boolean);

            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                // Send progress update
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
              } catch {
                // Skip malformed lines
              }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { action, url, model } = await request.json();
  const ollamaUrl = url || "http://localhost:11434";

  try {
    switch (action) {
      case "status":
        return await checkStatus(ollamaUrl);
      case "models":
        return await listModels(ollamaUrl);
      case "pull":
        return await pullModel(ollamaUrl, model);
      case "delete":
        return await deleteModel(ollamaUrl, model);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}

async function checkStatus(url: string) {
  try {
    const res = await fetch(`${url}/api/tags`, { 
      signal: AbortSignal.timeout(5000) 
    });
    if (res.ok) {
      return NextResponse.json({ online: true });
    }
    return NextResponse.json({ online: false });
  } catch {
    return NextResponse.json({ online: false });
  }
}

async function listModels(url: string) {
  try {
    const res = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      throw new Error("Failed to fetch models");
    }
    const data = await res.json();
    return NextResponse.json({ 
      models: data.models || [],
      success: true 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      models: [], 
      success: false,
      error: error.message 
    });
  }
}

async function pullModel(url: string, model: string) {
  if (!model) {
    return NextResponse.json({ error: "Model name required" }, { status: 400 });
  }

  try {
    // Start the pull - this is async on Ollama's side
    const res = await fetch(`${url}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model, stream: false }),
      signal: AbortSignal.timeout(300000), // 5 minute timeout for large models
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Failed to pull model");
    }

    return NextResponse.json({ 
      success: true,
      message: `Model ${model} pulled successfully`
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message 
    });
  }
}

async function deleteModel(url: string, model: string) {
  if (!model) {
    return NextResponse.json({ error: "Model name required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${url}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || "Failed to delete model");
    }

    return NextResponse.json({ 
      success: true,
      message: `Model ${model} deleted`
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message 
    });
  }
}

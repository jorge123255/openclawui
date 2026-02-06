import { NextResponse } from "next/server";
import { execSync } from "child_process";

function curlGet(url: string, timeoutSec: number = 5): string {
  return execSync(`curl -m ${timeoutSec} -s "${url}"`, { encoding: "utf-8" });
}

function curlPost(url: string, body: any, timeoutSec: number = 10): string {
  const json = JSON.stringify(body).replace(/'/g, "'\\''");
  return execSync(
    `curl -m ${timeoutSec} -s -X POST -H "Content-Type: application/json" -d '${json}' "${url}"`,
    { encoding: "utf-8" }
  );
}

export async function POST(request: Request) {
  const { action, url, model } = await request.json();
  const ollamaUrl = url || "http://localhost:11434";

  try {
    switch (action) {
      case "status":
        return checkStatus(ollamaUrl);
      case "models":
        return listModels(ollamaUrl);
      case "pull":
        return pullModel(ollamaUrl, model);
      case "delete":
        return deleteModel(ollamaUrl, model);
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

function checkStatus(url: string) {
  try {
    const raw = curlGet(`${url}/api/tags`, 5);
    const data = JSON.parse(raw);
    return NextResponse.json({ online: !!data });
  } catch {
    return NextResponse.json({ online: false });
  }
}

function listModels(url: string) {
  try {
    const raw = curlGet(`${url}/api/tags`, 10);
    const data = JSON.parse(raw);
    return NextResponse.json({
      models: data.models || [],
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json({
      models: [],
      success: false,
      error: error.message,
    });
  }
}

function pullModel(url: string, model: string) {
  if (!model) {
    return NextResponse.json({ error: "Model name required" }, { status: 400 });
  }
  try {
    const raw = curlPost(`${url}/api/pull`, { name: model, stream: false }, 300);
    return NextResponse.json({
      success: true,
      message: `Model ${model} pulled successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

function deleteModel(url: string, model: string) {
  if (!model) {
    return NextResponse.json({ error: "Model name required" }, { status: 400 });
  }
  try {
    const json = JSON.stringify({ name: model }).replace(/'/g, "'\\''");
    execSync(
      `curl -m 30 -s -X DELETE -H "Content-Type: application/json" -d '${json}' "${url}/api/delete"`,
      { encoding: "utf-8" }
    );
    return NextResponse.json({
      success: true,
      message: `Model ${model} deleted`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

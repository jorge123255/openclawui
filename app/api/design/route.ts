import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

function getConfigPath(): string {
  const clawdbotPath = join(homedir(), ".clawdbot", "clawdbot.json");
  try {
    require("fs").accessSync(clawdbotPath);
    return clawdbotPath;
  } catch {
    return join(homedir(), ".openclaw", "openclaw.json");
  }
}

async function getConfig() {
  try {
    const data = await readFile(getConfigPath(), "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const { html, instruction, selectedElement } = await request.json();
    
    if (!instruction) {
      return NextResponse.json({ error: "Instruction required" }, { status: 400 });
    }

    const config = await getConfig();
    const gatewayPort = config.gateway?.port || 18789;
    const gatewayToken = config.gateway?.auth?.token;

    let prompt = `You are a web designer AI. You modify HTML/CSS based on instructions.

RULES:
- Return ONLY the complete modified HTML document (from <!DOCTYPE html> to </html>)
- Do NOT include markdown code fences or any explanation
- Keep all existing content unless told to change it
- Use inline styles for simplicity
- Make visually appealing, modern designs
- Use system-ui font family by default
- Keep the dark theme (bg: #0f172a, text: #e2e8f0) unless told otherwise

`;

    if (selectedElement) {
      prompt += `SELECTED ELEMENT:
- Tag: ${selectedElement.tag}
- ID: ${selectedElement.id || 'none'}
- Classes: ${selectedElement.classes?.join(', ') || 'none'}
- Text: "${selectedElement.text}"
- Current styles: ${JSON.stringify(selectedElement.styles, null, 2)}
- Selector: ${selectedElement.selector}
- OuterHTML: ${selectedElement.outerHTML}

`;
    }

    prompt += `CURRENT HTML:
${html}

INSTRUCTION: ${instruction}

Return the complete modified HTML document:`;

    const url = `http://127.0.0.1:${gatewayPort}/v1/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (gatewayToken) {
      headers["Authorization"] = `Bearer ${gatewayToken}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "default",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: instruction },
        ],
        stream: false,
        user: "design-mode",
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Gateway error: ${res.status} - ${text}` }, { status: 500 });
    }

    const data = await res.json();
    let response = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown code fences if the AI included them anyway
    response = response.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
    
    // Validate it looks like HTML
    if (!response.includes('<') || !response.includes('>')) {
      return NextResponse.json({ error: "AI didn't return valid HTML", raw: response }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      html: response,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

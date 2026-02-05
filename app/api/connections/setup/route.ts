import { NextResponse } from "next/server";
import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

const execEnv = { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}` };
const run = (cmd: string, opts?: any) => execAsync(cmd, { timeout: 15000, env: execEnv, ...opts });

// ── In-memory session store for multi-step auth flows ──
interface AuthSession {
  process: ChildProcess;
  output: string;
  authUrl: string | null;
  startedAt: number;
  resolved: boolean;
}

const authSessions = new Map<string, AuthSession>();

function cleanup() {
  const now = Date.now();
  const keys = Array.from(authSessions.keys());
  for (const key of keys) {
    const session = authSessions.get(key)!;
    if (now - session.startedAt > 300_000) {
      try { session.process.kill(); } catch {}
      authSessions.delete(key);
    }
  }
}

export async function POST(request: Request) {
  cleanup();

  try {
    const body = await request.json();
    const { service, step = "init", data = {} } = body;

    if (!service) {
      return NextResponse.json({ error: "Missing service" }, { status: 400 });
    }

    switch (service) {
      // ────────────────────────────────────────────
      // GOOGLE – multi-step: credentials → auth
      // ────────────────────────────────────────────
      case "google": {
        if (step === "check-credentials") {
          // Check if OAuth client credentials exist
          try {
            const { stdout } = await run("gog auth credentials list 2>&1");
            const hasCreds = !String(stdout).toLowerCase().includes("no oauth");
            return NextResponse.json({ hasCreds, output: String(stdout).trim() });
          } catch {
            return NextResponse.json({ hasCreds: false });
          }
        }

        if (step === "save-credentials") {
          // Save OAuth client credentials JSON
          const { credentialsJson } = data;
          if (!credentialsJson) {
            return NextResponse.json({ error: "No credentials JSON provided" });
          }

          const tmpFile = join(tmpdir(), `gog-creds-${Date.now()}.json`);
          try {
            await writeFile(tmpFile, credentialsJson, "utf8");
            const { stdout, stderr } = await run(`gog auth credentials import "${tmpFile}" 2>&1`, { timeout: 10000 });
            await unlink(tmpFile).catch(() => {});

            const output = String(stdout) + String(stderr || "");
            if (output.toLowerCase().includes("error") && !output.toLowerCase().includes("already")) {
              return NextResponse.json({ error: "Failed to import credentials: " + output });
            }

            return NextResponse.json({ success: true, message: "OAuth credentials saved!" });
          } catch (e: any) {
            await unlink(tmpFile).catch(() => {});
            return NextResponse.json({ error: "Import failed: " + e.message });
          }
        }

        if (step === "start-auth") {
          // Start gog auth add <email> --manual
          const { email } = data;
          if (!email) {
            return NextResponse.json({ error: "Email required" });
          }

          // Kill any existing session
          const existing = authSessions.get("google");
          if (existing) {
            try { existing.process.kill(); } catch {}
            authSessions.delete("google");
          }

          return new Promise<NextResponse>((resolve) => {
            const proc = spawn("gog", ["auth", "add", email, "--manual", "--services=all"], {
              env: execEnv,
            });

            const session: AuthSession = {
              process: proc,
              output: "",
              authUrl: null,
              startedAt: Date.now(),
              resolved: false,
            };

            authSessions.set("google", session);

            const onData = (chunk: Buffer) => {
              session.output += chunk.toString();
              // Look for Google OAuth URL
              const urlMatch = session.output.match(/(https:\/\/accounts\.google\.com\S+)/);
              if (urlMatch && !session.resolved) {
                session.authUrl = urlMatch[1];
                session.resolved = true;
                resolve(NextResponse.json({
                  step: "authorize",
                  authUrl: session.authUrl,
                  message: "Open this link to sign in with Google. After authorizing, you'll be redirected — copy the full URL from your browser's address bar and paste it below.",
                }));
              }
            };

            proc.stdout.on("data", onData);
            proc.stderr.on("data", onData);

            // If process exits quickly (error)
            proc.on("close", (code) => {
              if (!session.resolved) {
                session.resolved = true;
                resolve(NextResponse.json({
                  error: "Auth process exited (code " + code + "): " + session.output.slice(0, 500),
                }));
              }
            });

            // Timeout after 15s
            setTimeout(() => {
              if (!session.resolved) {
                session.resolved = true;
                resolve(NextResponse.json({
                  error: "Timed out waiting for auth URL. Output: " + session.output.slice(0, 500),
                }));
              }
            }, 15000);
          });
        }

        if (step === "complete-auth") {
          // User has the redirect URL, feed it to the running gog process
          const { redirectUrl } = data;
          if (!redirectUrl) {
            return NextResponse.json({ error: "Redirect URL required" });
          }

          const session = authSessions.get("google");
          if (!session) {
            return NextResponse.json({ error: "No active auth session. Please start again." });
          }

          return new Promise<NextResponse>((resolve) => {
            let completionOutput = "";

            const onData = (chunk: Buffer) => {
              completionOutput += chunk.toString();
            };

            session.process.stdout?.on("data", onData);
            session.process.stderr?.on("data", onData);

            // Write the redirect URL to stdin
            session.process.stdin?.write(redirectUrl.trim() + "\n");

            session.process.on("close", (code) => {
              authSessions.delete("google");
              if (code === 0) {
                resolve(NextResponse.json({ success: true, message: "Google connected! 🎉" }));
              } else {
                resolve(NextResponse.json({
                  error: "Auth failed (exit " + code + "): " + completionOutput.slice(0, 500),
                }));
              }
            });

            // Timeout after 30s
            setTimeout(() => {
              authSessions.delete("google");
              try { session.process.kill(); } catch {}
              resolve(NextResponse.json({
                error: "Auth completion timed out. Output: " + completionOutput.slice(0, 500),
              }));
            }, 30000);
          });
        }

        return NextResponse.json({ error: "Unknown step for google: " + step });
      }

      // ────────────────────────────────────────────
      // GITHUB – PAT token flow
      // ────────────────────────────────────────────
      case "github": {
        if (step === "init") {
          // Check if gh CLI exists
          try {
            await run("which gh");
          } catch {
            return NextResponse.json({
              error: "gh CLI not found. Install with: brew install gh",
            });
          }

          return NextResponse.json({
            step: "token",
            authUrl: "https://github.com/settings/tokens/new?scopes=repo,read:org,gist&description=Bob+(OpenClaw)",
            message: "Create a Personal Access Token (classic) on GitHub with repo, read:org, and gist scopes. Then paste it below.",
          });
        }

        if (step === "complete") {
          const { token } = data;
          if (!token) {
            return NextResponse.json({ error: "No token provided" });
          }

          try {
            // Write token to temp file to avoid shell escaping issues
            const tmpFile = join(tmpdir(), `gh-token-${Date.now()}`);
            await writeFile(tmpFile, token.trim(), "utf8");

            const { stdout, stderr } = await run(
              `gh auth login --with-token < "${tmpFile}" 2>&1`,
              { timeout: 15000 }
            );
            await unlink(tmpFile).catch(() => {});

            // Verify
            const { stdout: status } = await run("gh auth status 2>&1 || true", { timeout: 5000 });
            const statusStr = String(status);

            if (statusStr.includes("Logged in to")) {
              const match = statusStr.match(/Logged in to .+ as (\S+)/);
              return NextResponse.json({
                success: true,
                message: `GitHub connected as ${match?.[1] || "user"}! 🎉`,
                username: match?.[1],
              });
            } else {
              return NextResponse.json({
                error: "Token accepted but auth verification failed: " + statusStr.slice(0, 300),
              });
            }
          } catch (e: any) {
            return NextResponse.json({
              error: "Authentication failed: " + (e.stderr || e.message),
            });
          }
        }

        return NextResponse.json({ error: "Unknown step for github: " + step });
      }

      // ────────────────────────────────────────────
      // APPLE REMINDERS – permission check
      // ────────────────────────────────────────────
      case "apple-reminders": {
        try {
          const { stdout } = await run("remindctl lists 2>&1", { timeout: 10000 });
          const output = String(stdout);
          if (output.toLowerCase().includes("error") || output.toLowerCase().includes("denied")) {
            return NextResponse.json({
              success: false,
              error: "Permission denied. Go to System Settings → Privacy & Security → Reminders and enable access for Terminal.",
              instructions: true,
            });
          }
          return NextResponse.json({ success: true, message: "Apple Reminders connected!" });
        } catch (e: any) {
          return NextResponse.json({
            success: false,
            error: "Grant Reminders access: System Settings → Privacy & Security → Reminders → Enable Terminal",
            instructions: true,
          });
        }
      }

      // ────────────────────────────────────────────
      // THINGS 3 – app + CLI check
      // ────────────────────────────────────────────
      case "things": {
        try {
          const { stdout: whichOut } = await run("which things 2>&1 || echo NO_CLI", { timeout: 5000 });
          if (String(whichOut).includes("NO_CLI")) {
            return NextResponse.json({
              success: false,
              error: "Things CLI not installed.",
              instructions: true,
              steps: [
                "Install Things 3 from the Mac App Store",
                "Install CLI: brew install things-cli",
              ],
            });
          }
          return NextResponse.json({ success: true, message: "Things 3 connected!" });
        } catch (e: any) {
          return NextResponse.json({
            success: false,
            error: "Things 3 setup failed: " + e.message,
            instructions: true,
          });
        }
      }

      // ────────────────────────────────────────────
      // iMESSAGE – Full Disk Access check
      // ────────────────────────────────────────────
      case "imessage": {
        try {
          const { stdout } = await run("imsg chats --limit 1 2>&1", { timeout: 5000 });
          const output = String(stdout);
          if (output.includes("denied") || output.includes("permission")) {
            return NextResponse.json({
              success: false,
              error: "Full Disk Access required.",
              instructions: true,
              steps: [
                "Open System Settings → Privacy & Security → Full Disk Access",
                "Click + and add Terminal (and the OpenClaw gateway process)",
                "Restart Terminal",
              ],
            });
          }
          return NextResponse.json({ success: true, message: "iMessage connected!" });
        } catch (e: any) {
          const msg = String(e.stderr || e.message || "").toLowerCase();
          if (msg.includes("denied") || msg.includes("permission")) {
            return NextResponse.json({
              success: false,
              error: "Full Disk Access required for iMessage.",
              instructions: true,
              steps: [
                "Open System Settings → Privacy & Security → Full Disk Access",
                "Click + and add Terminal",
                "Restart Terminal",
              ],
            });
          }
          return NextResponse.json({ success: false, error: e.message });
        }
      }

      default:
        return NextResponse.json({ error: "Unknown service" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "notifications";

  try {
    if (type === "notifications") {
      const { stdout } = await execAsync(
        `gh api notifications --jq '.[] | {id: .id, title: .subject.title, repo: .repository.full_name, type: .subject.type, reason: .reason, url: .subject.url, updatedAt: .updated_at, unread: .unread}' 2>/dev/null | head -50`
      );

      const lines = stdout.trim().split("\n").filter(Boolean);
      const notifications = lines.map((line) => {
        try {
          const n = JSON.parse(line);
          // Convert API URL to web URL
          let webUrl = n.url || "";
          webUrl = webUrl
            .replace("api.github.com/repos", "github.com")
            .replace("/pulls/", "/pull/")
            .replace("/issues/", "/issues/");
          return { ...n, url: webUrl };
        } catch {
          return null;
        }
      }).filter(Boolean);

      return NextResponse.json({ success: true, notifications });
    } else {
      // Pull requests
      const { stdout } = await execAsync(
        `gh pr list --state open --json number,title,headRepository,author,url,createdAt,additions,deletions,isDraft --limit 20 2>/dev/null`
      );

      const rawPrs = JSON.parse(stdout || "[]");
      const prs = Array.isArray(rawPrs) ? rawPrs.map((pr: any) => ({
        id: String(pr.number),
        title: pr.title,
        repo: pr.headRepository?.name || "unknown",
        number: pr.number,
        state: "open",
        draft: pr.isDraft || false,
        author: pr.author?.login || "unknown",
        url: pr.url,
        createdAt: pr.createdAt,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
      })) : [];

      return NextResponse.json({ success: true, prs });
    }
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: "Not logged into GitHub. Run 'gh auth login' to connect.",
      notifications: [],
      prs: [],
    });
  }
}

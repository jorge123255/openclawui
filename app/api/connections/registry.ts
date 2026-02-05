// Connection registry: maps skill IDs to their connection metadata.
// When a skill is installed, it appears in Connections if it has an entry here.

export interface ConnectionDef {
  id: string;
  name: string;
  description: string;
  icon: string;           // lucide icon name
  color: string;
  skill: string;          // skill directory name
  auth: {
    type: "oauth" | "token" | "api-key" | "cli-auth" | "system-permission" | "app-required" | "none";
    checkCmd?: string;     // command to verify connection
    checkSuccess?: string; // string that indicates success in output
    checkFail?: string;    // string that indicates failure
    setupSteps?: string[]; // manual setup instructions
  };
  category: "productivity" | "social" | "media" | "developer" | "smart-home" | "security" | "communication" | "other";
}

// ── The registry ──
// Add entries here for any skill that needs auth/setup.
// Skills not listed here will show as "installed, no setup needed."

export const CONNECTION_REGISTRY: ConnectionDef[] = [
  // ── Productivity ──
  {
    id: "google",
    name: "Google Workspace",
    description: "Gmail, Calendar, Contacts, Drive, Docs, Sheets",
    icon: "mail",
    color: "red",
    skill: "gog",
    auth: {
      type: "oauth",
      checkCmd: "gog auth credentials list 2>&1",
      checkSuccess: "client_id",
      checkFail: "no oauth",
    },
    category: "productivity",
  },
  {
    id: "apple-reminders",
    name: "Apple Reminders",
    description: "Lists, tasks, due dates",
    icon: "check-square",
    color: "orange",
    skill: "apple-reminders",
    auth: {
      type: "system-permission",
      checkCmd: "remindctl lists 2>&1",
      checkFail: "error|denied|not found",
      setupSteps: [
        "Open System Settings → Privacy & Security → Reminders",
        "Enable access for Terminal",
      ],
    },
    category: "productivity",
  },
  {
    id: "things",
    name: "Things 3",
    description: "Projects, todos, areas, tags",
    icon: "check-square",
    color: "blue",
    skill: "things-mac",
    auth: {
      type: "app-required",
      checkCmd: "which things 2>&1",
      checkFail: "not found",
      setupSteps: [
        "Install Things 3 from the Mac App Store",
        "Install CLI: brew install things-cli",
      ],
    },
    category: "productivity",
  },
  {
    id: "apple-notes",
    name: "Apple Notes",
    description: "Notes, folders, search",
    icon: "sticky-note",
    color: "yellow",
    skill: "apple-notes",
    auth: {
      type: "system-permission",
      checkCmd: "which apple-notes 2>&1 || echo NOT_FOUND",
      checkFail: "NOT_FOUND",
      setupSteps: ["Grant Notes access in System Settings if prompted"],
    },
    category: "productivity",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Pages, databases, search",
    icon: "book-open",
    color: "gray",
    skill: "notion",
    auth: {
      type: "api-key",
      checkCmd: "echo $NOTION_API_KEY",
      checkFail: "^$",
      setupSteps: [
        "Go to notion.so/my-integrations",
        "Create an integration and copy the API key",
        "Set NOTION_API_KEY in your environment",
      ],
    },
    category: "productivity",
  },
  {
    id: "trello",
    name: "Trello",
    description: "Boards, cards, lists",
    icon: "layout-grid",
    color: "blue",
    skill: "trello",
    auth: {
      type: "api-key",
      checkCmd: "echo $TRELLO_API_KEY",
      checkFail: "^$",
      setupSteps: [
        "Go to trello.com/app-key",
        "Copy your API key and generate a token",
        "Set TRELLO_API_KEY and TRELLO_TOKEN in your environment",
      ],
    },
    category: "productivity",
  },

  // ── Developer ──
  {
    id: "github",
    name: "GitHub",
    description: "Repos, Issues, PRs, Actions",
    icon: "github",
    color: "gray",
    skill: "github",
    auth: {
      type: "token",
      checkCmd: "gh auth status 2>&1",
      checkSuccess: "Logged in to",
      checkFail: "not logged",
    },
    category: "developer",
  },

  // ── Communication ──
  {
    id: "imessage",
    name: "iMessage",
    description: "Messages, chats, send texts",
    icon: "message-square",
    color: "green",
    skill: "imsg",
    auth: {
      type: "system-permission",
      checkCmd: "imsg chats --limit 1 2>&1",
      checkFail: "denied|permission|error",
      setupSteps: [
        "Open System Settings → Privacy & Security → Full Disk Access",
        "Click + and add Terminal (and OpenClaw gateway)",
        "Restart Terminal",
      ],
    },
    category: "communication",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Channels, messages, search",
    icon: "hash",
    color: "purple",
    skill: "slack",
    auth: {
      type: "token",
      checkCmd: "echo $SLACK_TOKEN",
      checkFail: "^$",
      setupSteps: [
        "Create a Slack app at api.slack.com/apps",
        "Install to your workspace",
        "Copy the Bot User OAuth Token",
        "Set SLACK_TOKEN in your environment",
      ],
    },
    category: "communication",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Servers, channels, messages",
    icon: "message-circle",
    color: "indigo",
    skill: "discord",
    auth: {
      type: "token",
      checkCmd: "echo $DISCORD_TOKEN",
      checkFail: "^$",
    },
    category: "communication",
  },

  // ── Social ──
  {
    id: "twitter",
    name: "X / Twitter",
    description: "Posts, timeline, search, engage",
    icon: "at-sign",
    color: "gray",
    skill: "bird",
    auth: {
      type: "cli-auth",
      checkCmd: "bird whoami 2>&1",
      checkFail: "error|not found|no cookies",
      setupSteps: [
        "Export cookies from your browser (use a cookie export extension)",
        "Run: bird auth import <cookies-file>",
      ],
    },
    category: "social",
  },

  // ── Media ──
  {
    id: "spotify",
    name: "Spotify",
    description: "Playback, search, playlists",
    icon: "music",
    color: "green",
    skill: "spotify-player",
    auth: {
      type: "cli-auth",
      checkCmd: "which spotify_player 2>&1 || echo NOT_FOUND",
      checkFail: "NOT_FOUND",
      setupSteps: [
        "Install: brew install spotify_player",
        "Run: spotify_player (will open browser for auth)",
      ],
    },
    category: "media",
  },

  // ── Smart Home ──
  {
    id: "unifi-protect",
    name: "UniFi Protect",
    description: "Security cameras, snapshots, events",
    icon: "camera",
    color: "blue",
    skill: "unifi-protect",
    auth: {
      type: "api-key",
      checkCmd: "echo $UNIFI_PROTECT_API_KEY | head -c 5",
      checkFail: "^$",
      setupSteps: [
        "Open UniFi Protect settings",
        "Create an API key",
        "Set UNIFI_PROTECT_API_KEY in your environment",
      ],
    },
    category: "security",
  },
  {
    id: "openhue",
    name: "Philips Hue",
    description: "Lights, scenes, rooms",
    icon: "lightbulb",
    color: "yellow",
    skill: "openhue",
    auth: {
      type: "cli-auth",
      checkCmd: "which openhue 2>&1 || echo NOT_FOUND",
      checkFail: "NOT_FOUND",
    },
    category: "smart-home",
  },
  {
    id: "sonos",
    name: "Sonos",
    description: "Speakers, playback, groups",
    icon: "speaker",
    color: "gray",
    skill: "sonoscli",
    auth: {
      type: "none",
      checkCmd: "which sonos 2>&1 || echo NOT_FOUND",
      checkFail: "NOT_FOUND",
    },
    category: "smart-home",
  },

  // ── Automation ──
  {
    id: "n8n",
    name: "n8n",
    description: "Workflow automation",
    icon: "zap",
    color: "orange",
    skill: "n8n",
    auth: {
      type: "api-key",
      checkCmd: "curl -sf http://192.168.1.13:5678/api/v1/workflows?limit=1 -H 'X-N8N-API-KEY: ${N8N_API_KEY}' 2>&1 | head -c 20",
      checkFail: "error|unauthorized|''",
    },
    category: "other",
  },

  // ── AI / Tools ──
  {
    id: "openai-whisper",
    name: "OpenAI Whisper",
    description: "Audio transcription",
    icon: "mic",
    color: "gray",
    skill: "openai-whisper-api",
    auth: {
      type: "api-key",
      checkCmd: "echo $OPENAI_API_KEY | head -c 5",
      checkFail: "^$",
    },
    category: "other",
  },
  {
    id: "openai-images",
    name: "OpenAI Image Gen",
    description: "DALL-E image generation",
    icon: "image",
    color: "green",
    skill: "openai-image-gen",
    auth: {
      type: "api-key",
      checkCmd: "echo $OPENAI_API_KEY | head -c 5",
      checkFail: "^$",
    },
    category: "other",
  },
];

// Build a lookup map: skill name → connection def
export const SKILL_TO_CONNECTION = new Map<string, ConnectionDef>();
for (const def of CONNECTION_REGISTRY) {
  SKILL_TO_CONNECTION.set(def.skill, def);
}

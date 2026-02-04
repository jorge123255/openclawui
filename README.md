# OpenClaw UI 🦞

A beautiful web interface for OpenClaw/Clawdbot - control your AI assistant without touching the terminal.

## Features

### 💬 Chat
- Talk to your assistant from the browser
- **Voice input** - Tap mic to speak (Web Speech API)
- **Push notifications** - Get notified when assistant replies
- Message history with copy/clear

### 🔗 Connections
- **Google Workspace** - Gmail, Calendar, Contacts, Drive
- **GitHub** - Repos, issues, PRs, Actions
- **Apple Reminders** - Lists, tasks, due dates
- **Things 3** - Projects, todos, areas
- **iMessage** - Messages, chats
- One-click OAuth/permission setup

### 🧠 AI Models
- Primary model picker (Anthropic, OpenAI, Ollama)
- **Ollama integration** - Pull models, see installed
- **Model Hierarchy** - Assign models to roles (Primary, Coding, Research, Vision, Fast)
- Quick presets for common setups

### 📊 Dashboard
- Gateway connection status
- Live stats (sessions, cron jobs, memory backend)
- Service health (Ollama, N8N)
- Quick action tiles

### 🛠️ More Pages
- **Memory** - View/edit files, semantic search (QMD)
- **Sessions** - Active conversations
- **Cron** - Scheduled jobs
- **Nodes** - Paired devices
- **Skills** - Browse & install from OpenClaw repo
- **Integrations** - N8N workflows, MCP tools, network scan
- **Logs** - Session transcripts with filtering
- **Settings** - Identity, Channels, API Keys, Gateway config

### 🎨 UI Features
- **Dark/Light theme** toggle
- **PWA support** - Add to home screen
- **Mobile responsive** - Works on phones
- Smooth animations (Framer Motion)

## Quick Start

```bash
git clone https://github.com/jorge123255/openclawui.git
cd openclawui
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Requirements:**
- Node.js 18+
- OpenClaw/Clawdbot running locally
- Gateway at default port (18789)

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** + CSS variables for theming
- **Framer Motion** for animations
- **Lucide React** for icons

## Project Structure

```
app/
├── page.tsx           # Dashboard
├── chat/              # Chat interface
├── connections/       # Service connections
├── memory/            # Memory viewer/search
├── models/            # AI model config
├── sessions/          # Session list
├── cron/              # Cron jobs
├── nodes/             # Paired devices
├── skills/            # Skill browser
├── integrations/      # N8N, MCP, services
├── logs/              # Session transcripts
├── settings/          # All settings
├── setup/             # First-run wizard
└── api/               # API routes (call clawdbot CLI)
```

## API Routes

The UI calls the `clawdbot` CLI for most operations:

| Route | Purpose |
|-------|---------|
| `/api/gateway` | Config get/patch, start/stop |
| `/api/sessions` | List sessions |
| `/api/cron` | List cron jobs |
| `/api/nodes` | List nodes |
| `/api/memory` | Memory files, search, settings |
| `/api/chat` | Send messages |
| `/api/connections/*` | Check/setup service connections |
| `/api/ollama` | Ollama models |
| `/api/skills` | Fetch skills from GitHub |

## Screenshots

Coming soon - run locally to see!

## License

MIT

---

Built for the OpenClaw community 🦞

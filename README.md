# OpenClaw UI 🦞

A beautiful, user-friendly interface for setting up and managing OpenClaw/Clawdbot.

**Make AI assistants accessible to everyone - no terminal required.**

![OpenClaw UI](./docs/screenshot.png)

## Features

### 🧙‍♂️ Setup Wizard
- Guided installation process
- Choose deployment: Local, Docker, or Remote
- Connect channels: Telegram, Discord, SMS
- Link integrations: Email, Calendar, Smart Home

### 🧠 AI Model Management
- **Auto-detect hardware** (GPU, RAM, VRAM)
- **Ollama integration**
  - See installed models
  - Browse Ollama library
  - One-click pull & install
  - Model recommendations based on your hardware
- **Multi-provider support**
  - Anthropic (Claude)
  - OpenAI (GPT-4)
  - Google (Gemini)
  - Local (Ollama, LM Studio)
- **AI Hierarchy** - Drag & drop to prioritize models

### 🔌 Integrations Hub
Visual connection manager for:
- 📧 Email (Gmail, Outlook, IMAP)
- 📅 Calendar (Google, Apple, Outlook)
- 🏠 Smart Home (HomeKit, Google Home, Alexa)
- 📹 Cameras (UniFi Protect, Ring, Wyze)
- 💬 Messaging (Telegram, Discord, Slack, Signal)
- 🔧 Custom webhooks

### 📊 Dashboard
- Live gateway status
- Recent activity feed
- Usage & cost tracking
- Quick actions

### 🛒 Skills Marketplace
- Browse community skills
- One-click install
- Manage installed skills

## Quick Start

```bash
# Clone the repo
git clone https://github.com/jorge123255/openclawui.git
cd openclawui

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Components:** Radix UI primitives
- **State:** Zustand
- **Animations:** Framer Motion

## Project Structure

```
openclawui/
├── app/
│   ├── page.tsx              # Landing/Dashboard
│   ├── setup/
│   │   └── page.tsx          # Setup wizard
│   ├── models/
│   │   └── page.tsx          # AI model management
│   ├── integrations/
│   │   └── page.tsx          # Connections hub
│   ├── skills/
│   │   └── page.tsx          # Skills marketplace
│   └── settings/
│       └── page.tsx          # Settings
├── components/
│   ├── ui/                   # Base UI components
│   ├── setup/                # Setup wizard components
│   ├── models/               # Model management
│   └── layout/               # Layout components
├── lib/
│   ├── api/                  # API clients
│   ├── hooks/                # Custom hooks
│   └── utils/                # Utilities
└── store/
    └── index.ts              # Zustand store
```

## Screenshots

### Setup Wizard
![Setup](./docs/setup.png)

### Model Management
![Models](./docs/models.png)

### Integrations
![Integrations](./docs/integrations.png)

## Contributing

PRs welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT

---

Built with ❤️ for the OpenClaw community

# Deploying SlotScribe to Dokploy

This guide explains how to deploy the SlotScribe Viewer and Autonomous Agent to your own server using [Dokploy](https://dokploy.com/).

## Prerequisites

1. A server with Dokploy installed.
2. Your project repository pushed to GitHub/GitLab (it can be Public).

## Step-by-Step Deployment

### 1. Create a New Compose Project
In your Dokploy dashboard:
- Click **"Create Project"**.
- Select **"Compose"** (Docker Compose).
- Link your GitHub repository.
- Specify the path to the compose file: `docker-compose.dokploy.yml`.

### 2. Configure Environment Variables (Crucial for Open Source)
Dokploy allows you to keep secrets private even if your code is public. Go to the **"Environment Variables"** tab in Dokploy and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `API_KEY` | `sk-...` | Your OpenAI/OpenRouter API Key |
| `BASE_URL` | `https://...` | API Base URL (optional for OpenRouter) |
| `NODE_ENV` | `production` | Set to production |

> [!IMPORTANT]
> Do **NOT** commit your `.env` or `.colosseum-agent.json` files to GitHub. Dokploy will inject these keys securely during runtime.

### 3. Handle Persistence (Agent Registry)
The Autonomous Agent stores its registration and social history in `.colosseum-agent.json`.
- The `docker-compose.dokploy.yml` is already configured to use a persistent volume `agent_data`.
- This ensures that if the container restarts or you update the code, the Agent doesn't "forget" its identity or double-reply to posts.

### 4. Deploy
Click **"Deploy"**. Dokploy will:
1. Pull your latest code.
2. Build the Docker image (using the multi-stage `Dockerfile`).
3. Start the **Viewer** on port 3000.
4. Start the **Agent** in its 24/7 loop.

## Monitoring
- **Viewer**: Access your server's IP/Domain at port 3000 to see the dashboard.
- **Agent Logs**: View the logs for the `agent` service in Dokploy to see LLM interactions in real-time.

---
*SlotScribe: Flight Recorder for Autonomous Agents.*

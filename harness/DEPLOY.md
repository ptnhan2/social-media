# Self-host deployment guide

## Prerequisites

1. A server (VPS/cloud) with Python 3.11+, Node.js 20+, Docker
2. A domain name (e.g. isaacverse-harness.com)
3. API key for your LLM provider (DeepSeek, Google, Anthropic)

## Steps

### 1. Install langgraph CLI

```bash
pip install langgraph-cli
```

### 2. Set up environment

Create `.env` on the server:
```
DEEPSEEK_API_KEY=your-key
HARNESS_MODEL=deepseek:deepseek-chat
LANGSMITH_TRACING=false
```

### 3. Install harness dependencies

```bash
cd /path/to/social-media
python -m venv harness/.venv
harness/.venv/bin/pip install deepagents langchain-deepseek langgraph
```

### 4. Set up Postgres (for persistent store + checkpointer)

```bash
# Install Postgres
sudo apt install postgresql

# Create database
sudo -u postgres createdb isaacverse_harness

# Connection string for langgraph.json
# DATABASE_URL=postgresql://user:pass@localhost:5432/isaacverse_harness
```

### 5. Configure langgraph.json for production

Update `langgraph.json`:
```json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./harness/agent.py:agent",
    "consolidation": "./harness/consolidation_agent.py:main"
  },
  "env": ".env",
  "store": {
    "type": "postgres",
    "url": "postgresql://user:pass@localhost:5432/isaacverse_harness"
  }
}
```

### 6. Build and deploy

```bash
# Build the agent
langgraph build

# Run the server (port 2024)
langgraph dev --port 2024 --host 0.0.0.0

# Or for production:
langgraph up --port 2024 --host 0.0.0.0
```

### 7. Build and serve the frontend

```bash
cd harness/frontend
npm install
npm run build  # outputs to dist/

# Serve with nginx (see nginx.conf below)
sudo cp -r dist/* /var/www/isaacverse-harness/
```

### 8. Nginx config

```nginx
server {
    listen 80;
    server_name isaacverse-harness.com;

    # Frontend
    location / {
        root /var/www/isaacverse-harness;
        try_files $uri $uri/ /index.html;
    }

    # API proxy to LangGraph
    location /api/ {
        proxy_pass http://127.0.0.1:2024/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # WebSocket for streaming
    location /ws/ {
        proxy_pass http://127.0.0.1:2024/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 9. SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d isaacverse-harness.com
```

### 10. Start everything

```bash
# Start LangGraph server
langgraph up --port 2024 --host 127.0.0.1 &

# Start nginx
sudo systemctl restart nginx

# (Optional) Set up consolidation cron
# Run consolidation agent every 6 hours
echo "0 */6 * * * cd /path/to/social-media && harness/.venv/bin/python harness/consolidation_agent.py" | crontab -
```

## Verify

```bash
# Check agent is running
curl http://localhost:2024/health

# Check frontend
curl http://localhost:80/

# Open in browser
open https://isaacverse-harness.com
```

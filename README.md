# loopquest-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for [LoopQuest](https://loopquest.tomphillips.uk). Lets any MCP-capable agent (Claude Desktop, Cursor, Windsurf, custom agents) send its output for gamified **human-in-the-loop review** and get a verdict back.

## Tools

- **create_review_task** — send content for a human to approve or flag. Returns a task id; the verdict arrives via webhook (`callback_url`) or `get_task_status`.
- **get_task_status** — check a task's status / verdict.

## Configure

Set `LOOPQUEST_API_KEY` (Workspaces → API keys). Optionally `LOOPQUEST_BASE_URL` for a self-hosted deployment.

### Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "loopquest": {
      "command": "npx",
      "args": ["-y", "loopquest-mcp"],
      "env": { "LOOPQUEST_API_KEY": "lq_your_key" }
    }
  }
}
```

Cursor / Windsurf use the same `command` / `args` / `env` shape in their MCP settings.

## Develop

```bash
npm install
npm test          # unit tests
npm run build     # tsc -> dist/
node dist/index.js
```

## License

MIT

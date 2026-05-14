# nakaz-402-mcp

MCP (Model Context Protocol) server that exposes [Order МОУ № 402](https://nakaz-402.vercel.app/)
as tools for AI agents — Claude Desktop, Claude Code, ChatGPT desktop, Cursor, Zed, etc.

## Tools

| Tool | What it does |
|------|------|
| `get_order` | Base order metadata. |
| `list_amendments` | All 23 amendments, newest first. |
| `get_amendment` | One amendment by MOU order # (e.g. `518`). |
| `list_polozhennia` | All 29 chapters (slugs, titles, parents). |
| `get_polozhennia` | One chapter with full Markdown body. |
| `search_polozhennia` | Case-insensitive substring search across all titles + bodies. |
| `get_glossary` | 25 Ukrainian abbreviations + expansions. |
| `list_drafts` | Proposed amendments with status + lint summary. Optional `status` filter. |
| `get_draft` | One draft with full operations, lint findings, and the auto-generated formal change-act text ready to paste into a publishable наказ. |

## Install

Use directly with `npx` — no install:

```jsonc
// Claude Desktop · ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "nakaz-402": {
      "command": "npx",
      "args": ["-y", "nakaz-402-mcp"]
    }
  }
}
```

Self-hosted variant — point at your own mirror:

```jsonc
{
  "mcpServers": {
    "nakaz-402": {
      "command": "npx",
      "args": ["-y", "nakaz-402-mcp"],
      "env": { "NAKAZ_402_BASE_URL": "https://my-mirror.example.com" }
    }
  }
}
```

## Example prompts

> What does пункт 1.4 of глава 1 say?

> List every amendment that changed glava 5 in the last two years.

> Search the order for "Трембіта" and show me the relevant chapters.

The agent uses `search_polozhennia` / `get_polozhennia` / `list_amendments`
to answer, citing the rada.gov.ua source link in each response.

## License

CC0 1.0 Universal. Authoritative source remains zakon.rada.gov.ua.

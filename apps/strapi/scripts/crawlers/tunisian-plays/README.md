# Tunisian Plays Crawler

A CLI tool to crawl Tunisian theatrical plays from various online sources and prepare them for seeding into Tiween's creative works database.

## Features

- **Multi-source crawling**: Teskerti.tn, Theatre National Tunisien, Festival de Carthage
- **Bilingual support**: Handles French and Arabic content
- **ImageKit integration**: Automatically uploads poster images for triage
- **Deduplication**: Fuzzy matching to identify plays across sources
- **Confidence scoring**: Flags incomplete data for manual review
- **Seed-compatible output**: JSON files ready for database import

## Quick Start

```bash
# From the strapi directory
cd apps/strapi

# Run crawler with all sources
yarn crawl:plays

# Crawl specific source only
yarn crawl:plays --source teskerti

# Preview without writing files
yarn crawl:plays --dry-run

# Skip image uploads (faster for testing)
yarn crawl:plays --skip-images

# Verbose logging
yarn crawl:plays --verbose
```

## Commands

```bash
# Main crawl command
yarn crawl:plays [options]

# List available sources
yarn crawl:plays:sources

# Validate configuration
yarn crawl:plays:validate
```

### Options

| Option                | Description                   | Default     |
| --------------------- | ----------------------------- | ----------- |
| `-s, --source <name>` | Crawl specific source only    | All sources |
| `-n, --dry-run`       | Preview without writing files | false       |
| `--skip-images`       | Skip ImageKit uploads         | false       |
| `-v, --verbose`       | Enable detailed logging       | false       |
| `-m, --max-pages <n>` | Max pages per source          | 10          |
| `-d, --delay <ms>`    | Delay between requests        | 2000        |

## Configuration

### Environment Variables

For ImageKit integration, set these environment variables:

```bash
export IMAGEKIT_PUBLIC_KEY="your_public_key"
export IMAGEKIT_PRIVATE_KEY="your_private_key"
export IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your_id"
```

Without these, images will not be uploaded (source URLs preserved).

## Output

Crawl results are saved to `output/<timestamp>-crawl/`:

```
output/2025-01-24-crawl/
├── plays.json      # Seed-compatible play data
├── persons.json    # Extracted directors and actors
├── report.md       # Human-readable summary
└── raw/            # Raw source data for debugging
    └── teskerti.json
```

### plays.json Format

```json
[
  {
    "title": "Play Title",
    "title_ar": "عنوان المسرحية",
    "slug": "play-title",
    "type": "play",
    "synopsis": "Description...",
    "duration": 90,
    "releaseYear": 2024,
    "directors": ["director-slug"],
    "cast": ["actor-slug"],
    "poster": "https://ik.imagekit.io/.../poster.jpg",
    "_meta": {
      "source": "teskerti",
      "sourceUrl": "https://teskerti.tn/...",
      "confidence": 0.85,
      "needsReview": false
    }
  }
]
```

## Workflow

1. **Crawl**: Run `yarn crawl:plays` to discover plays
2. **Review**: Check `report.md` for low-confidence entries
3. **Triage images**: Review `/crawled/plays/triage/` in ImageKit dashboard
4. **Import**: Copy approved entries to seed data files

## Available Sources

| Source            | Status     | Description                        |
| ----------------- | ---------- | ---------------------------------- |
| teskerti          | ✅ Active  | Tunisia's #1 e-ticketing platform  |
| theatre-national  | 🚧 Planned | National Theatre of Tunisia        |
| carthage-festival | 🚧 Planned | Festival International de Carthage |

## GitHub Actions

The crawler can run automatically via GitHub Actions:

- **Manual trigger**: Run from Actions tab
- **Scheduled**: Weekly on Mondays (disabled by default)

To enable scheduled runs, uncomment the cron schedule in `.github/workflows/crawl-tunisian-plays.yml`.

### Required Secrets

- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_URL_ENDPOINT`

## Development

### Project Structure

```
scripts/crawlers/tunisian-plays/
├── cli.ts              # CLI entry point
├── types.ts            # TypeScript types
├── adapters/           # Source-specific crawlers
│   ├── index.ts
│   └── teskerti.ts
├── services/           # Core services
│   ├── crawler.ts      # Orchestrator
│   ├── imagekit.ts     # Image uploads
│   ├── normalizer.ts   # Data transformation
│   └── output.ts       # File generation
├── utils/              # Utilities
│   ├── confidence.ts   # Scoring
│   ├── dedup.ts        # Deduplication
│   ├── http.ts         # HTTP client
│   └── text.ts         # Text processing
└── output/             # Crawl results (gitignored)
```

### Adding a New Source

1. Create adapter in `adapters/<source-name>.ts`
2. Implement `SourceAdapter` interface
3. Register in `adapters/index.ts`

```typescript
import type { AdapterResult, CrawlOptions, SourceAdapter } from "../types.js"

export class NewSourceAdapter implements SourceAdapter {
  readonly name = "new-source"
  readonly description = "Description of the source"
  readonly baseUrl = "https://example.com"

  async crawl(options?: CrawlOptions): Promise<AdapterResult> {
    // Implementation
  }
}
```

## Troubleshooting

### "ImageKit not configured"

Set the required environment variables or use `--skip-images`.

### Rate limiting / IP blocking

The crawler uses respectful delays (2-5s) and user-agent rotation. If blocked:

- Increase delay with `--delay 5000`
- Reduce pages with `--max-pages 5`

### Missing Arabic text

Some sources may not provide Arabic content. Check the `needsReview` flag and fill manually.

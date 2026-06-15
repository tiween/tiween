#!/usr/bin/env node
/**
 * Tunisian Plays Crawler CLI
 *
 * Usage:
 *   yarn crawl:plays                    # Crawl all sources
 *   yarn crawl:plays --source teskerti  # Crawl specific source
 *   yarn crawl:plays --dry-run          # Preview without writing
 *   yarn crawl:plays --skip-images      # Skip ImageKit uploads
 *   yarn crawl:plays --verbose          # Detailed logging
 */

// Load environment variables from .env file (root of monorepo)
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import chalk from "chalk"
import { Command } from "commander"
import { config } from "dotenv"

import { getAdapterNames } from "./adapters/index.js"
import { runCrawler } from "./services/crawler.js"
import { validateImageKitConfig } from "./services/imagekit.js"
import { writeAllOutput } from "./services/output.js"
import { getConfidenceLevel } from "./utils/confidence.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// Load from monorepo root (5 levels up from this directory)
config({ path: resolve(__dirname, "../../../../../.env") })

const program = new Command()

program
  .name("crawl-plays")
  .description("Crawl Tunisian theatrical plays from various sources")
  .version("1.0.0")

program
  .command("crawl")
  .description("Crawl plays from configured sources")
  .option("-s, --source <names>", "Crawl specific source(s), comma-separated")
  .option("-n, --dry-run", "Preview without writing output files")
  .option("--skip-images", "Skip uploading images to ImageKit")
  .option("-v, --verbose", "Enable verbose logging")
  .option("-m, --max-pages <number>", "Maximum pages to crawl per source", "10")
  .option("-d, --delay <ms>", "Delay between requests in ms", "2000")
  .action(async (options) => {
    const verbose = options.verbose ?? false
    const dryRun = options.dryRun ?? false
    const skipImages = options.skipImages ?? false

    console.log(chalk.blue.bold("\n🎭 Tunisian Plays Crawler\n"))

    // Validate ImageKit if not skipping images
    if (!skipImages) {
      const imageKitValidation = validateImageKitConfig()
      if (!imageKitValidation.valid) {
        console.log(
          chalk.yellow(
            "⚠️  ImageKit not configured. Images will not be uploaded."
          )
        )
        console.log(
          chalk.yellow(`   Missing: ${imageKitValidation.missing.join(", ")}`)
        )
        console.log(
          chalk.yellow("   Use --skip-images to suppress this warning.\n")
        )
      }
    }

    // Determine sources (support comma-separated list)
    const sources = options.source
      ? options.source.split(",").map((s: string) => s.trim())
      : getAdapterNames()
    console.log(chalk.cyan(`📡 Sources: ${sources.join(", ")}`))
    console.log(chalk.cyan(`📄 Max pages: ${options.maxPages}`))
    console.log(chalk.cyan(`⏱️  Delay: ${options.delay}ms`))
    if (skipImages) console.log(chalk.cyan("🖼️  Images: Skipped"))
    if (dryRun)
      console.log(chalk.yellow("🔍 Dry run mode - no files will be written"))
    console.log("")

    try {
      // Run crawler
      const result = await runCrawler({
        sources,
        skipImages,
        verbose,
        maxPages: parseInt(options.maxPages, 10),
        delay: parseInt(options.delay, 10),
      })

      // Summary
      console.log(chalk.green.bold("\n✅ Crawl Complete\n"))

      console.log(chalk.white("📊 Summary:"))
      console.log(`   Total found: ${result.metadata.totalFound}`)
      console.log(`   After dedup: ${result.plays.length}`)
      console.log(`   Duplicates removed: ${result.metadata.duplicatesRemoved}`)
      console.log(`   Persons extracted: ${result.persons.length}`)
      console.log("")

      // Confidence breakdown
      const high = result.plays.filter(
        (p) => getConfidenceLevel(p.confidence) === "high"
      ).length
      const medium = result.plays.filter(
        (p) => getConfidenceLevel(p.confidence) === "medium"
      ).length
      const low = result.plays.filter(
        (p) => getConfidenceLevel(p.confidence) === "low"
      ).length

      console.log(chalk.white("🎯 Confidence:"))
      console.log(`   ${chalk.green("High:")} ${high}`)
      console.log(`   ${chalk.yellow("Medium:")} ${medium}`)
      console.log(`   ${chalk.red("Low (needs review):")} ${low}`)
      console.log("")

      // Image stats
      const { imageStats } = result.metadata
      console.log(chalk.white("🖼️  Images:"))
      console.log(`   Attempted: ${imageStats.attempted}`)
      console.log(`   ${chalk.green("Succeeded:")} ${imageStats.succeeded}`)
      console.log(`   ${chalk.red("Failed:")} ${imageStats.failed}`)
      console.log(`   Skipped: ${imageStats.skipped}`)
      console.log("")

      // Errors
      if (result.metadata.errors.length > 0) {
        console.log(chalk.red(`⚠️  Errors: ${result.metadata.errors.length}`))
        for (const error of result.metadata.errors.slice(0, 5)) {
          console.log(`   - ${error.type}: ${error.message}`)
        }
        if (result.metadata.errors.length > 5) {
          console.log(`   ... and ${result.metadata.errors.length - 5} more`)
        }
        console.log("")
      }

      // Write output
      if (!dryRun) {
        console.log(chalk.cyan("📁 Writing output files..."))
        const outputDir = await writeAllOutput(result)
        console.log(chalk.green(`✅ Output written to: ${outputDir}`))
        console.log("")
        console.log(chalk.white("📝 Files created:"))
        console.log(`   - plays.json (${result.plays.length} plays)`)
        console.log(`   - persons.json (${result.persons.length} persons)`)
        console.log("   - report.md")
      } else {
        console.log(chalk.yellow("📝 Dry run - no files written"))
        console.log("")

        // Show sample plays
        console.log(chalk.white("Sample plays found:"))
        for (const play of result.plays.slice(0, 5)) {
          const confidence = chalk[
            getConfidenceLevel(play.confidence) === "high"
              ? "green"
              : getConfidenceLevel(play.confidence) === "medium"
                ? "yellow"
                : "red"
          ](`${(play.confidence * 100).toFixed(0)}%`)
          console.log(
            `   - ${play.title} (${play.releaseYear || "N/A"}) [${confidence}]`
          )
        }
        if (result.plays.length > 5) {
          console.log(`   ... and ${result.plays.length - 5} more`)
        }
      }

      console.log("")
      console.log(chalk.green("🎉 Done!"))
      console.log("")
    } catch (error) {
      console.error(chalk.red("\n❌ Crawl failed:"), error)
      process.exit(1)
    }
  })

program
  .command("sources")
  .description("List available sources")
  .action(() => {
    console.log(chalk.blue.bold("\n📡 Available Sources\n"))

    for (const name of getAdapterNames()) {
      console.log(`   - ${chalk.cyan(name)}`)
    }

    console.log("")
  })

program
  .command("validate")
  .description("Validate configuration")
  .action(() => {
    console.log(chalk.blue.bold("\n🔧 Configuration Validation\n"))

    // Check ImageKit
    const imageKit = validateImageKitConfig()
    if (imageKit.valid) {
      console.log(chalk.green("✅ ImageKit: Configured"))
    } else {
      console.log(chalk.red("❌ ImageKit: Not configured"))
      console.log(`   Missing: ${imageKit.missing.join(", ")}`)
    }

    // Check adapters
    const adapters = getAdapterNames()
    console.log(
      chalk.green(
        `✅ Adapters: ${adapters.length} available (${adapters.join(", ")})`
      )
    )

    console.log("")
  })

// Default command is 'crawl'
program.argument("[command]", "Command to run").action((cmd) => {
  if (!cmd) {
    program.commands.find((c) => c.name() === "crawl")?.parse(process.argv)
  }
})

program.parse()

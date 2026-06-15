---
name: data-extractor
description: Intelligent data extraction and enhancement from crawled web content. Use when enhancing crawler output, extracting structured information from Wikipedia articles, parsing credits/cast from theatrical play pages, or when crawled data needs AI-assisted cleanup and enrichment.
allowed-tools: Read, Write, Edit, Glob
argument-hint: "[input file path] [output file path]"
---

# Intelligent Data Extractor for Tunisian Plays

You are a specialized data extraction assistant. Your role is to analyze raw web content from the Tunisian Plays Crawler and extract/enhance structured data that rule-based parsers might miss.

## Your Mission

Take partially parsed data and enhance it by:

1. Extracting missing fields from raw text (Arabic titles, years, persons)
2. Normalizing inconsistent formats
3. Identifying persons (directors, actors, crew) and their roles
4. Cleaning and standardizing names (handling French/Arabic variations)

## Workflow

1. Read the input file: $ARGUMENTS (first argument)
2. For each play entry, analyze all available text fields
3. Extract and enhance all available fields
4. Write enhanced output to the specified location (second argument, or `enhanced-plays.json`)
5. Report summary: plays processed, fields enhanced, confidence changes

## Input Format

The crawler outputs JSON with entries like:

```json
{
  "title": "TranstyX",
  "slug": "transtyx",
  "type": "play",
  "synopsis": "TranstyX est une pièce de théâtre tunisienne...",
  "releaseYear": 2019,
  "directors": [],
  "cast": [],
  "_meta": {
    "source": "wikipedia",
    "sourceUrl": "https://fr.wikipedia.org/wiki/TranstyX",
    "confidence": 0.55
  }
}
```

## Output Format

Produce enhanced JSON:

```json
{
  "title": "TranstyX",
  "title_ar": null,
  "slug": "transtyx",
  "type": "play",
  "synopsis": "TranstyX est une pièce de théâtre tunisienne écrite et réalisée par Moncef Zahrouni en 2019...",
  "releaseYear": 2019,
  "directors": ["Moncef Zahrouni"],
  "writers": ["Moncef Zahrouni"],
  "cast": [
    { "name": "Sonia Hedhili", "character": "Tina" },
    { "name": "Amina Ben Doua", "character": "Stella, l'ange gardien" }
  ],
  "crew": [
    { "name": "Zeyneb Farhat", "role": "Production" },
    { "name": "Walid Hassir", "role": "Scénographie" }
  ],
  "_meta": {
    "source": "wikipedia",
    "sourceUrl": "https://fr.wikipedia.org/wiki/TranstyX",
    "confidence": 0.85,
    "enhancedBy": "data-extractor",
    "enhancedAt": "2024-01-24T12:00:00Z"
  }
}
```

## Extraction Patterns

### Arabic Titles

Look for patterns in synopsis/description:

- `(arabe : منطق الطير)` → extract `منطق الطير`
- `(arabe : حورية)` → extract `حورية`

### Directors & Writers

Keywords indicating director/writer roles:

- "mise en scène", "réalisation", "réalisé par" → director
- "texte", "dramaturgie", "écrit par", "auteur" → writer
- "de et avec [Name]" → both director and actor

### Cast (Distribution)

Pattern: `Actor Name : Character Name`

- "Sonia Hedhili : Tina" → `{ name: "Sonia Hedhili", character: "Tina" }`

### Crew (Fiche technique)

Pattern: `Role : Person Name`

- "Production : Zeyneb Farhat" → `{ name: "Zeyneb Farhat", role: "Production" }`
- "Scénographie : Walid Hassir et Moncef Zahrouni" → two crew entries

### Year Extraction

Look for date patterns in text:

- "créée en 2019", "créée le 25 février 2017"
- "première en avril 2010"
- "représentée en juin 2006"

## Name Cleaning Rules

1. Remove wiki markup: `[[Name|Display]]` → `Display`
2. Split multiple names: "X et Y" → ["X", "Y"]
3. Handle commas: "X, Y et Z" → ["X", "Y", "Z"]
4. Preserve diacritics: Jaïbi, Yaïch, Farhat
5. Trim whitespace and normalize spacing

## Confidence Scoring

Recalculate confidence based on completeness:

- 0.9+: title, year, director, cast all present
- 0.7-0.9: Missing 1-2 of the above
- 0.5-0.7: Missing 3+ fields
- <0.5: Only basic info (title, synopsis)

## Summary Report

After processing, output a summary like:

```
## Enhancement Summary

- Plays processed: 10
- Fields enhanced:
  - Arabic titles found: 3
  - Directors extracted: 8
  - Cast members found: 24
  - Crew members found: 45
- Average confidence: 0.72 → 0.85 (+18%)
- Plays still needing review: 2
```

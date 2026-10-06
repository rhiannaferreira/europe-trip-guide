---
updatedAt: 2026-09-18T19:56:02.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# How to understand Languages

## Overview

The `GET /locations/{id}/reviews` endpoint accepts a `language` query parameter that controls which language translations are returned in review content. This page lists all valid language codes, explains how language filtering interacts with the review pool, and documents the `language_meta` metadata object.

## How language filtering works

When you pass a `language` parameter, the API returns reviews that have translations available in that language. Content fields affected are:

* `title` — review title
* `text` — review body text

Reviews that do not have content in the requested language are filtered out of the response entirely.

## The review pool

The reviews endpoint uses a **review pool**: a fixed base set of your most recent reviews for a location. The `language` filter narrows results from this pool, but never changes which reviews are in it.

The pool is determined by your delivery configuration using one of two strategies:

| Strategy        | Description                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `recent_count`  | The pool contains a fixed number of the most recent reviews for the location (e.g. the 25 most recent). This is the default strategy. |
| `recent_months` | The pool contains all reviews published within a configured time window (e.g. last 6 months).                                         |

**Order of operations:**

1. The system identifies your review pool (most recent N reviews, or reviews within the time window)
2. The `language` filter narrows the pool to reviews that have content in the requested language
3. Additional filters (`rating_min`, `trip_type`) are applied
4. The final result is paginated

This means the language filter applies **within** your contracted review pool, not before it. If your pool is 25 reviews, the system first identifies the 25 most recent reviews (regardless of language), then filters by language.

## Valid language codes

The following 27 language codes are accepted by the `language` parameter:

| Code    | Language              |
| ------- | --------------------- |
| `ar`    | Arabic                |
| `cs`    | Czech                 |
| `da`    | Danish                |
| `de`    | German                |
| `el`    | Greek                 |
| `en`    | English               |
| `es`    | Spanish               |
| `fi`    | Finnish               |
| `fr`    | French                |
| `hu`    | Hungarian             |
| `id`    | Indonesian            |
| `it`    | Italian               |
| `iw`    | Hebrew                |
| `ja`    | Japanese              |
| `ko`    | Korean                |
| `nl`    | Dutch                 |
| `no`    | Norwegian             |
| `pl`    | Polish                |
| `pt`    | Portuguese            |
| `ru`    | Russian               |
| `sk`    | Slovak                |
| `sr`    | Serbian               |
| `sv`    | Swedish               |
| `th`    | Thai                  |
| `tr`    | Turkish               |
| `vi`    | Vietnamese            |
| `zh-CN` | Chinese (Simplified)  |
| `zh-TW` | Chinese (Traditional) |

## Special keywords

| Value     | Behavior                                                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `primary` | Returns reviews in their originally-authored language only. No machine translations are included. Useful for NLP, sentiment analysis, or displaying reviews exactly as the traveler wrote them. |

## Default behavior

When no `language` parameter is supplied, the API defaults to `en` (English). Reviews are filtered to those with English content available.

## No fallback for UGC languages

Unlike factual content locales, UGC languages do **not** follow a fallback chain. If you request `language=fr` and no French reviews exist in the pool, the result is an empty data array. We enforce this strict matching to ensure you never receive unexpected languages in your UGC payload.

## Error handling

Passing an unsupported language code returns a `400 Bad Request` response:

```json
{
  "status": 400,
  "type": "https://docs.terra.tripadvisor.com/errors/validation",
  "title": "Validation Error",
  "detail": "language: Unsupported UGC language 'xx'. Supported languages: ar, cs, da, de, el, en, es, fi, fr, hu, id, it, iw, ja, ko, nl, no, pl, pt, ru, sk, sr, sv, th, tr, vi, zh-CN, zh-TW"
}
```

<br />
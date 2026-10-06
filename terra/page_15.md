---
updatedAt: 2026-09-18T19:56:13.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# How to understand Locales

In-depth guide on how to retreive locales

Tripadvisor supports over 28 points of sale across the globe and localizes the user experience for travelers visiting our sites. For example, a user in Mexico will see slightly different, localized Spanish than a user visiting our Argentina site. The same goes for someone in the UK and in the US viewing content in English.

To take advantage of Tripadvisor's unique localization across our content, please refer to this guide to retrieve the desired locale in your integration.

## Overview

The `locale` query parameter controls which language and regional variant is returned for factual content: names, descriptions, addresses, GenAI text, and enum labels (categories, awards, subratings). It is available on all factual-content endpoints.

Locales are distinct from the `language` parameter used on the reviews endpoint. The key difference:

|                     | `locale` (factual content)                                            | `language` (reviews/UGC)                          |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| **Granularity**     | Full locale with regional variant (e.g. `es-MX`, `fr-CA`)             | Canonical language only (e.g. `es`, `fr`)         |
| **Fallback**        | Yes — walks a fallback chain when content is missing                  | No — returns empty if no content in that language |
| **Multiple values** | Yes — pass multiple times for multi-locale responses                  | No — single value only                            |
| **Applies to**      | Names, descriptions, addresses, GenAI content, geo names, enum labels | Review titles, text, owner responses              |

## How to use the locale parameter

Pass `locale` as a query parameter on any factual endpoint:

```
GET /locations/{id}?locale=es-MX
```

**Multiple locales:** Repeat the parameter to request content in several locales:

```
GET /locations/{id}?locale=es-MX&locale=fr-FR
```

The response includes translations for each requested locale where content is available.

**Default:** When `locale` is omitted, the API defaults to `en-US`.

## Fallback chain

When content is not available for your requested locale, the system walks a fallback chain to find the next best match. The chain follows locale parent relationships, then falls back to English.

**Example:** Requesting `locale=es-AR` triggers this fallback chain:

```
es-AR → es-MX → es → en-US → en
```

The system tries each locale in order and returns the first one for which content exists. The `language` field on each translation object tells you which locale was actually resolved — so you can see that you requested `es-AR` but received `es-MX` content.

**Additional fallback chain examples:**

| Requested locale | Fallback chain                            |
| ---------------- | ----------------------------------------- |
| `es-AR`          | `es-AR` → `es-MX` → `es` → `en-US` → `en` |
| `en-AU`          | `en-AU` → `en-UK` → `en` → `en-US`        |
| `fr-CA`          | `fr-CA` → `fr-FR` → `fr` → `en-US` → `en` |
| `zh-HK`          | `zh-HK` → `zh-TW` → `zh` → `en-US` → `en` |
| `de-AT`          | `de-AT` → `de-DE` → `de` → `en-US` → `en` |
| `pt-BR`          | `pt-BR` → `pt` → `en-US` → `en`           |

**How the chain is built:**

1. Start with the requested locale itself
2. Follow declared parent locales until a root is reached
3. Append the language-only prefix (e.g. `es` from `es-AR`) if not already in the chain
4. Append `en-US` if not already present
5. Append `en` as the final backstop

## Enum translations vs. content translations

The locale parameter affects two types of content differently:

### Content translations (arrays)

Fields like `names`, `descriptions`, and `addresses` are returned as arrays of translation objects. When you pass multiple locales, the response includes one entry per locale that has content available:

```json
{
  "names": [
    {"language": "es-MX", "value": "El Bistró de Locale", "primary": false},
    {"language": "fr-FR", "value": "Le Bistrot Locale", "primary": false}
  ]
}
```

Each array element resolves independently through the fallback chain.

### Enum translations (single labels)

Fields like category `display_name`, award names, and subrating type labels are single strings, not arrays. They resolve using only the **first** requested locale (with its fallback chain):

```json
{
  "top_level_category": {
    "id": "10022",
    "display_name": "Restaurante"
  }
}
```

**Full list of fields affected:**

| Field type               | Fields                                                                                                                  | Resolution                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Content translations** | `names`, `descriptions`, `addresses`, `genai_descriptions`, `genai_review_summaries`, `geo.names`, `forum_faqs`         | Array — one entry per resolved locale               |
| **Enum labels**          | `top_level_category.display_name`, `subcategories[].display_name`, `awards[].display_name`, `subratings[].display_name` | Single value — first requested locale with fallback |

## API vs. feeds

The locale parameter works differently depending on whether you're using the API or receiving data feeds:

| Aspect                  | API                                               | Feeds                                                        |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| **How locales are set** | Per-request via the `locale` query parameter      | Configured in your delivery settings (set during onboarding) |
| **Default**             | `en-US` when parameter is omitted                 | As configured in your delivery settings                      |
| **Multiple locales**    | Pass `?locale=es-MX&locale=fr-FR` on each request | Configured as a list in your delivery settings               |
| **Fallback behavior**   | Same fallback chain resolution                    | Same fallback chain resolution                               |
| **Output format (V1)**  | Underscored codes: `es_MX`                        | Underscored codes: `es_MX`                                   |
| **Output format (V2+)** | Dashed codes: `es-MX`                             | Dashed codes: `es-MX`                                        |

<Callout icon="📘" theme="info">
  The `locale` query parameter always accepts dashed format (`es-MX`) regardless of API version. The V1/V2 format difference only applies to locale codes in response bodies.
</Callout>

## Multiple locale behavior

When you pass multiple locales, the response includes content for each locale where a translation is available (after fallback resolution):

```
GET /locations/{id}?locale=es-MX&locale=fr-FR&locale=pt-BR
```

```json
{
  "names": [
    {"language": "es-MX", "value": "El Bistró de Locale", "primary": false},
    {"language": "fr-FR", "value": "Le Bistrot Locale", "primary": false},
    {"language": "pt", "value": "O Bistrô Locale", "primary": false}
  ]
}
```

Note that `pt-BR` resolved to `pt` via the fallback chain (the `language` field shows what was actually found).

**Deduplication:** If two requested locales resolve to the same underlying translation (e.g. both `es-AR` and `es-CL` resolve to `es-MX`), the translation appears only once in the response.

## Supported locales

### English

| Locale  | Region              | Parent   |
| ------- | ------------------- | -------- |
| `en-US` | United States       | — (root) |
| `en-UK` | United Kingdom      | — (root) |
| `en-AU` | Australia           | `en-UK`  |
| `en-CA` | Canada (English)    | `en-UK`  |
| `en-HK` | Hong Kong (English) | `en-UK`  |
| `en-IE` | Ireland             | `en-UK`  |
| `en-IN` | India               | `en-UK`  |
| `en-MY` | Malaysia            | `en-UK`  |
| `en-NZ` | New Zealand         | `en-UK`  |
| `en-PH` | Philippines         | `en-US`  |
| `en-SG` | Singapore           | `en-UK`  |
| `en-ZA` | South Africa        | `en-UK`  |

### Spanish

| Locale  | Region    | Parent   |
| ------- | --------- | -------- |
| `es-ES` | Spain     | — (root) |
| `es-MX` | Mexico    | — (root) |
| `es-AR` | Argentina | `es-MX`  |
| `es-CL` | Chile     | `es-MX`  |
| `es-CO` | Colombia  | `es-MX`  |
| `es-PE` | Peru      | `es-MX`  |
| `es-VE` | Venezuela | `es-MX`  |

### French

| Locale  | Region               | Parent   |
| ------- | -------------------- | -------- |
| `fr-FR` | France               | — (root) |
| `fr-BE` | Belgium (French)     | `fr-FR`  |
| `fr-CA` | Canada (French)      | `fr-FR`  |
| `fr-CH` | Switzerland (French) | `fr-FR`  |

### German

| Locale  | Region               | Parent   |
| ------- | -------------------- | -------- |
| `de-DE` | Germany              | — (root) |
| `de-AT` | Austria              | `de-DE`  |
| `de-CH` | Switzerland (German) | `de-DE`  |

### Portuguese

| Locale  | Region   | Parent   |
| ------- | -------- | -------- |
| `pt-BR` | Brazil   | — (root) |
| `pt-PT` | Portugal | — (root) |

### Dutch

| Locale  | Region          | Parent   |
| ------- | --------------- | -------- |
| `nl-NL` | Netherlands     | — (root) |
| `nl-BE` | Belgium (Dutch) | `nl-NL`  |

### Italian

| Locale  | Region                | Parent   |
| ------- | --------------------- | -------- |
| `it-IT` | Italy                 | — (root) |
| `it-CH` | Switzerland (Italian) | `it-IT`  |

### Chinese

| Locale  | Region              | Parent   |
| ------- | ------------------- | -------- |
| `zh`    | China (Simplified)  | — (root) |
| `zh-TW` | Taiwan              | — (root) |
| `zh-HK` | Hong Kong (Chinese) | `zh-TW`  |

### Arabic

| Locale  | Region               | Parent   |
| ------- | -------------------- | -------- |
| `ar`    | International Arabic | — (root) |
| `ar-EG` | Egypt                | `ar`     |

### Single-locale languages

| Locale  | Language   |
| ------- | ---------- |
| `da-DK` | Danish     |
| `el-GR` | Greek      |
| `fi`    | Finnish    |
| `he-IL` | Hebrew     |
| `hu`    | Hungarian  |
| `id-ID` | Indonesian |
| `ja-JP` | Japanese   |
| `ko-KR` | Korean     |
| `no-NO` | Norwegian  |
| `pl`    | Polish     |
| `ru-RU` | Russian    |
| `sv-SE` | Swedish    |
| `th-TH` | Thai       |
| `tr-TR` | Turkish    |
| `vi-VN` | Vietnamese |

## Error handling

Passing an unsupported locale code returns a `400 Bad Request` response:

```json
{
  "status": 400,
  "type": "https://docs.terra.tripadvisor.com/errors/validation",
  "title": "Validation Error",
  "detail": "locale[0]: Unsupported factual locale 'xx-YY'. Supported factual locales: ar, ar-EG, da-DK, de-AT, de-CH, de-DE, el-GR, en-AU, en-CA, en-HK, en-IE, en-IN, en-MY, en-NZ, en-PH, en-SG, en-UK, en-US, en-ZA, es-AR, es-CL, es-CO, es-ES, es-MX, es-PE, es-VE, fi, fr-BE, fr-CA, fr-CH, fr-FR, he-IL, hu, id-ID, it-CH, it-IT, ja-JP, ko-KR, nl-BE, nl-NL, no-NO, pl, pt-BR, pt-PT, ru-RU, sv-SE, th-TH, tr-TR, vi-VN, zh, zh-HK, zh-TW"
}
```

Bare language codes (e.g. `en` instead of `en-US`) are also rejected — use the full locale code from the supported list above.
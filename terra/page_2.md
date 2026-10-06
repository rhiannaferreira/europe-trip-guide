---
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Version 2

Version 2 introduces locale output format standardization and new response metadata for review language filtering transparency. This changelog documents the key API changes and differences between V1 and V2.

***

## Locale code format: underscored to dashed

V2 standardizes all locale codes in API responses to use the **dashed format** (BCP 47), replacing the underscored format used in V1.

| V1 format | V2 format |
| --------- | --------- |
| `en_US`   | `en-US`   |
| `es_MX`   | `es-MX`   |
| `fr_FR`   | `fr-FR`   |
| `pt_BR`   | `pt-BR`   |
| `zh_CN`   | `zh-CN`   |

This affects the `language` field on all translation objects (`names`, `descriptions`, `addresses`, and other translated content arrays).

**Example — V1 response:**

```json
{
  "names": [
    {"language": "es_MX", "value": "El Bistró de Locale", "primary": false}
  ]
}
```

**Example — V2 response:**

```json
{
  "names": [
    {"language": "es-MX", "value": "El Bistró de Locale", "primary": false}
  ]
}
```

<Callout icon="📘" theme="info">
   **Migration note:** If your integration parses or matches on the `language` field in translation objects, update your code to expect dashed locale codes (e.g. `es-MX` instead of `es_MX`) when using V2. The `locale` query parameter accepts dashed format in both V1 and V2.
</Callout>

***

## `language_meta` object on reviews responses

V2 adds a `language_meta` metadata object to the reviews endpoint response. This object provides transparency into how language filtering interacts with your review pool, specifically, how many reviews exist in your pool vs. how many matched your language filter.

**Response structure:**

```json
{
  "data": [ ... ],
  "pagination": { ... },
  "language_meta": {
    "requested_language": "fr",
    "total_in_pool": 25,
    "matched_language": 8,
    "pool_definition": "recent_count"
  }
}
```

**Field reference:**

| Field                | Type      | Description                                                                                                                                                          |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requested_language` | `string`  | The language used to filter reviews in this response. Matches the supplied `language` query parameter, or `en` if none was specified.                                |
| `total_in_pool`      | `integer` | Total number of reviews in your review pool before language filtering was applied.                                                                                   |
| `matched_language`   | `integer` | Number of reviews in the pool that matched the requested language. This count is before additional filters like `rating_atleast` or `trip_type` are applied.         |
| `pool_definition`    | `string`  | The strategy used to define your review pool: `recent_count` (fixed number of most recent reviews) or `recent_months` (all reviews within a configured time window). |

**When `language_meta` appears:**

* Present when a language filter is active (from the `language` query parameter or your delivery configuration).
* Omitted when no language filter is applied.

**Example scenarios:**

| Scenario                                              | `total_in_pool` | `matched_language` | Explanation                                     |
| ----------------------------------------------------- | --------------- | ------------------ | ----------------------------------------------- |
| 25-review pool, requesting `language=fr`              | 25              | 8                  | 8 of 25 most recent reviews have French content |
| 25-review pool, requesting `language=en`              | 25              | 24                 | 24 of 25 have English content                   |
| Time-window pool (6 months), requesting `language=ja` | 42              | 3                  | 42 reviews in window, 3 have Japanese           |
| 25-review pool, requesting `language=primary`         | 25              | 25                 | All reviews have an original-language version   |

For more context on how the review pool works and how language filtering interacts with it, see the [Supported Languages for Reviews](/docs/supported-languages-for-reviews) guide.
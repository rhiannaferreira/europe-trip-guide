---
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Version 1

Version 1 introduces a comprehensive API schema overhaul, improved response quality and clarity, and new endpoints across our Partner API and Feed API. This changelog documents all API schema changes and breaking changes between v0 and v1.

***

## Versioning

v1 is the default. A request with no `version` parameter returns v1 responses.

* Pass `?version=1` to select v1 explicitly.
* `?version=0` is no longer available. v0 was retired on 6 November 2025 and now returns `410 Gone`.

Example:
`GET /locations/{id}?version=1`

<Callout icon="📘" theme="info">
  ### **Looking for v2?**

  See [API Versioning & Compatibility](/docs/versioning-compatibility) for the accepted values, and the [Version 2 changelog](/changelog/version-2) for what changed.
</Callout>

***

## Breaking Changes Summary

### Type Changes

| Endpoint         | Field Path     | v0 Type | v1 Type |
| ---------------- | -------------- | ------- | ------- |
| Location Reviews | `review.id`    | String  | Long    |
| Locations        | `status.value` | String  | Enum    |

### Structure Changes

| Endpoint         | Change                                                                          | Migration Action         |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------ |
| Locations        | `traveler_ratings.overall.subratings` → `traveler_ratings.subratings`           | Update JSON parsing path |
| Locations        | `traveler_ratings.overall.breakdowns` → `traveler_ratings.breakdowns`           | Update JSON parsing path |
| Locations        | `traveler_ratings.overall.language_counts` → `traveler_ratings.language_counts` | Update JSON parsing path |
| Location Reviews | Same subrating restructuring as Locations                                       | Update JSON parsing path |

### Removed Fields

No fields were removed. Every v0 field is available in v1, though some moved within the response structure.

***

## API Changes

### Locations Endpoints

#### Location Object Schema Changes

##### Changed: Status Object

**v0 Structure:**

```json
{
  "status": {
    "value": "OPEN",           // String
    "closed_date": "2025-01-01",
    "reopen_date": "2025-06-01"
  }
}
```

**v1 Structure:**

```json
{
  "status": {
    "value": "OPEN",           // Enum: "OPEN" | "CLOSED" | "TEMPORARILY_CLOSED"
    "closed_date": "2025-01-01",
    "reopen_date": "2025-06-01"
  }
}
```

**Breaking change:** `value` is now an enum — `OPEN`, `CLOSED` or `TEMPORARILY_CLOSED` — instead of a free-form string.

##### Changed: Traveler Ratings Object

**v0 Structure:**

```json
{
  "traveler_ratings": {
    "overall": {
      "rating": 4.5,
      "count": 1234,
      "icon_url": "https://...",
      "subratings": [],
      "breakdowns": [],
      "language_counts": []
    }
  }
}
```

**v1 Structure:**

```json
{
  "traveler_ratings": {
    "overall": {
      "rating": 4.5,
      "count": 1234,
      "icon_url": "https://..."
    },
    "subratings": [],
    "breakdowns": [],
    "language_counts": []
  }
}
```

**Breaking change:** `subratings`, `breakdowns` and `language_counts` moved from inside `overall` to the top level of `traveler_ratings`.

##### Enhanced: Subratings

**v0 Subrating Object:**

```json
{
  "type": "service",
  "rating": 4.5,
  "count": 500
}
```

**v1 Subrating Object:**

```json
{
  "type": "service",
  "rating": 4.5,
  "count": 500,
  "icon_url": "https://...",
  "type_name": "Service"
}
```

**New fields:**

* `icon_url` (String) — URL of the icon representing the subrating category
* `type_name` (String) — human-readable name for the subrating type

***

### Location Reviews Endpoints

#### LocationReviews Object Schema Changes

##### Changed: Review ID Type

**v0:**

```json
{
  "id": "12345"
}
```

**v1:**

```json
{
  "id": 12345
}
```

**Breaking change:** review `id` changed from String to Long. Store it as a 64-bit integer.

##### Changed: Rating Icon URL

**v0:**

```json
{
  "rating_icon_url": null  // Can be null or omitted
}
```

**v1:**

```json
{
  "rating_icon_url": "https://..."  // Always present when rating exists
}
```

**Enhancement:** `rating_icon_url` is now consistently populated whenever a rating exists.

##### Enhanced: Review Subratings

**v0 Review Subrating:**

```json
{
  "type": "service",
  "rating": 5
}
```

**v1 Review Subrating:**

```json
{
  "type": "service",
  "rating": 5,
  "icon_url": {               // NEW - ImageUrl object
    "key": "...",
    "url": "https://..."
  },
  "type_name": "Service"      // NEW
}
```

**New fields:**

* `icon_url` (ImageUrl object) — carries `key` and `url`
* `type_name` (String) — human-readable name for the subrating type

##### Changed: Traveler Ratings Structure

The same restructuring as the Location object: `subratings` moved to the top level.

**v0:**

```json
{
  "traveler_ratings": {
    "overall": {
      "rating": 4.5,
      "count": 1234,
      "icon_url": {},
      "subratings": []
    }
  }
}
```

**v1:**

```json
{
  "traveler_ratings": {
    "overall": {
      "rating": 4.5,
      "count": 1234,
      "icon_url": {}
    },
    "subratings": []
  }
}
```

***

### Recommendations Search Endpoint

The same Location object changes described in [Location Object Schema Changes](#location-object-schema-changes) apply here.

***

## Migration Notes

* Drop the `version` parameter, or pass `?version=1`. Do not pass `?version=0`; it returns `410 Gone`.
* Update parsing for the moved traveler-ratings fields.
* Treat review `id` as a number (Long).
* Handle status `value` as an enum: `OPEN`, `CLOSED`, `TEMPORARILY_CLOSED`.
* Expect omitted fields rather than empty objects or nulls. Code against absence.

***

## Support

* Refer to the [API Reference](/reference) for the current schema.
* Test against a development environment before deploying to production.
* Contact your Tripadvisor partnership team for migration assistance.

***

*Last updated: October 31, 2025*

<br />
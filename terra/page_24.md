---
updatedAt: 2026-06-18T16:15:44.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# API Versioning & Compatibility

## Overview

Tripadvisor's APIs use a parameter-based versioning model. Each API request should include a `version` parameter, which defines the version of the API contract you are integrating with.

Example:

```
GET /locations/123?version=1
```

This version controls the structure of all endpoints in that API and is applied per API, not per endpoint.

## Default Behavior

### API

If no version parameter is provided in your request, the API will automatically use the latest available version. This ensures that new integrations always receive the most up-to-date and supported contract by default.

```
GET /locations/123            	→ returns latest version
GET /locations/123?version=1  → returns v1.0 explicitly
```

If your integration requires a fixed version for stability, we strongly recommend specifying the api-version parameter in all requests. Each major API version maintains its own OpenAPI specification and changelog.

Minor and patch versions are automatically applied within the same major release and do not appear as separate documentation versions.

### Feeds

Feed versions are not automatically upgraded and will remain pinned until your configuration is updated.

If you need to change your feed version (for example, to move from v1 to v2), you can do so in the Management Portal, or in coordination with your Tripadvisor Account Manager or Partner Support Representative.

***

## Compatibility Policy

Tripadvisor APIs are designed to evolve while keeping partner integrations stable.

Within a given major version:

* We will not remove, rename, or change existing fields, parameters, or endpoints.
* We will not change data types, nullability, or validation rules in a way that invalidates existing requests.
* We may release new optional parameters, enum values, or internal optimizations that do not break compatibility.
* We may introduce new fields or objects to existing schemas
* We may fix bugs or improve performance without requiring version changes.

To maintain compatibility:

* Customers must ignore unknown fields and tolerate new enum values where possible.
* Avoid schema validation that rejects unexpected fields or objects.
* Always specify your api version explicitly to ensure predictable behavior.

### Definition of Breaking Changes

Based on how customers have integrated with our APIs, we consider these changes "breaking". Customers shouldn't expect these to reflect on any existing version:

* **New fields or objects within response schemas.** We realize some customers integrate with certain parsing or serializations that rely on a static schema per version.
* **New enum values.** Any new enum value will be introduced in new major version releases. We assume all existing enums as being used.

***

## Beta Version

We offer API end users the opportunity to test new features and enhancements by specifying `version=beta`.

The `version=beta` parameter value remains constant and always reflects the latest stable version plus any changes we are currently testing. This allows you to preview upcoming functionality before it becomes part of a new major version release.

**Important considerations when using beta:**

* **Breaking changes are made in the beta version.** Unlike stable versions, the beta version may include changes that break backward compatibility as we iterate on new features.
* The beta version is intended for testing and development purposes only - it should not be used in production environments.
* Features and behaviors in beta may change without notice as we refine them based on feedback and testing.

***

## Documentation & Deprecation

The documentation in this portal always reflects the latest major version of each API. Older major versions remain accessible but are hidden from the default view.

### Deprecation Headers

While major announcements are posted in our changelog, we also communicate the status of an API version directly within HTTP response headers. We adhere to RFC 9745 and RFC 8594 standards to help partners programmatically detect when an integration needs to be updated.

Your integration should passively monitor for these headers:

* `Deprecation`: A warning signal defined by RFC 9745.
  * **Format**: A Unix timestamp integer prefixed by @ (Structured Fields).
  * **Meaning**: The endpoint is fully functional, but support is ending. The timestamp indicates when deprecation began.
* `Sunset`: A removal signal defined by RFC 8594.
  * **Format**: An HTTP Date string (RFC 7231).
  * **Meaning**: The endpoint will become unresponsive (returning 410 Gone or 404 Not Found) after this date.

#### Example Response

Note the difference in date formatting between the two headers:

```
HTTP/1.1 200 OK
Deprecation: @1692143999
Sunset: Thu, 01 Jan 2026 00:00:00 GMT



{
  "data": { ... }
}
```

### Partner Expectations

To maintain a stable integration as our APIs evolve:

* **Monitor Headers**: Configure your application logs to flag the presence of Deprecation headers.
* **Update Proactively**: When a header is detected, review the Sunset date. You must update your integration to the latest api-version before the sunset date to avoid service disruption.
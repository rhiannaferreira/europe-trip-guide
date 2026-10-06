---
updatedAt: 2026-09-18T19:55:25.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# How to Manage your Allowlist

## What are Allowed Locations?

In the Tripadvisor Terra platform, your allowlist is the set of Tripadvisor Location IDs that your API key is permitted to return in API responses and data feeds. When you query the API or download a feed, results are scoped to the locations on your allowlist.

You manage this set yourself through the Allowlist endpoint — adding, removing, or replacing Location IDs as your needs change. This puts you in direct control of the catalog of locations your integration works with, in real time, without filing a request or waiting on Tripadvisor to process changes for you.

<Callout icon="📘" theme="info">
  **Not sure if this applies to you?**

  Depending on your contracted agreement, allowed locations may not be applicable to your account. If your agreement grants access to all locations within a geography or category, you may not need to manage an allowlist at all. Check your contract terms or contact your account team if you're unsure.
</Callout>

### How the allowlist relates to other endpoints

The allowlist governs what the **content endpoints** (Location Details, Reviews, Photos, and data feeds) will return for you. **It does not restrict the Catalog Search endpoints** (Search Locations Catalog and Search Nearby Locations Catalog), which search the full Tripadvisor catalog with limited data so you can discover the Location IDs you may want to add.

A typical workflow is: search the catalog → find Location IDs → add them to your allowlist → retrieve full content

***

## Key Concepts

### Tripadvisor Location IDs

Every place in the Tripadvisor catalog — hotels, restaurants, attractions, and geographies — has a unique numeric **Tripadvisor Location ID**. This ID is the single identifier used across the entire Terra platform: in the allowlist, in content endpoints, and in feeds.

If you don't already know the Location IDs for the places in your portfolio, use the Catalog Search endpoints to look them up by name or address before adding them to your allowlist. (See [Finding the right Location IDs](#finding-the-right-location-ids) below, and the migration note for partners coming from the legacy mapping process.)

### Supported operations

The allowlist endpoint supports the following operations:

| Operation     | Method             | Effect                                                 |
| ------------- | ------------------ | ------------------------------------------------------ |
| **Retrieve**  | `GET`              | Returns your current allowlist, paginated              |
| **Append**    | `POST` (APPEND)    | Adds new Location IDs, leaving existing ones untouched |
| **Delete**    | `POST` (DELETE)    | Removes the specified Location IDs                     |
| **Overwrite** | `POST` (OVERWRITE) | Replaces the entire allowlist with a new set           |

***

## Use Cases

### Initial Setup

When you first integrate with Terra, seed your allowlist with the set of locations you've verified are relevant to your use case — for example, the properties in your portfolio or the destinations your product covers. Use **APPEND** to build the list up, or **OVERWRITE** to set it in one call.

### Gradual Expansion

As your integration grows, **APPEND** new locations incrementally as you onboard new properties or expand into new markets, without disturbing what's already there.

### Location Removal

When a location is no longer relevant — a property leaves your portfolio, or a listing is out of scope — use **DELETE** to remove just those IDs while keeping the rest of the allowlist intact.

### Complete Refresh

When you maintain the source of truth for your portfolio in your own system, you can periodically push the full set with **OVERWRITE** to bring Terra fully in sync, rather than computing individual adds and removes.

> 👍 Choosing between APPEND/DELETE and OVERWRITE
>
> Use **APPEND** and **DELETE** for incremental, day-to-day changes. Use **OVERWRITE** when your own system holds the authoritative list and you want Terra to match it exactly. Be careful with OVERWRITE — any ID not included in the call **will be removed**.

***

## Getting Started

### Prerequisites

Before using the allowlist endpoint, ensure you have:

* A valid API key for your account
* The API key configured with the appropriate permissions
* Access to the Partner Services API base URL

### Authentication

All allowlist requests require authentication using your API key. Include it in the `X-API-Key` header on every request:

```
X-API-Key: your-api-key-here
```

### Retrieving Your Allowlist

The `GET` endpoint returns your current allowlist in a paginated format. The default page size is 1000 IDs.

### Basic Request

To retrieve the first page of your allowlist:

```bash
curl -X GET "https://terra.tripadvisor.com/api/allowlist?version=v1" \
  -H "X-API-Key: your-api-key-here"
```

<br />
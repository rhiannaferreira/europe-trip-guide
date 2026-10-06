---
updatedAt: 2026-09-18T19:55:05.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# How to Download Feeds

## Overview

Feeds deliver your licensed content as daily gzipped JSON files. They suit bulk processing and full-catalog syncs rather than per-request lookups. Feeds require the Innovate or Transform package and a feed configuration set up with your account team.

Feeds use their own API key, separate from the one you use for content endpoints.

## 1. Get your feed API key

* Contact your Tripadvisor partnership team to request feed access.
* Receive your feed API key.
* Confirm your feed configuration and delivery schedule.

## 2. Check which files are available

Use the List Files endpoint to see what you can download:

```bash
curl "https://terra.tripadvisor.com/api/feeds/files/list?version=1" \
  -H "X-API-Key: YOUR_FEED_API_KEY"
```

**Optional parameters**

| Parameter | Notes                                                               |
| --------- | ------------------------------------------------------------------- |
| `page`    | Page index. Pages are 1-based; the default is `1`.                  |
| `size`    | Files per page. The default is `5`, so raise it if you expect more. |
| `sort`    | Sort criteria for the results.                                      |

**Response**

```json
{
  "data": [
    { "filename": "location.json.gz", "filesize": 10420 }
  ],
  "pagination": {
    "page": 1,
    "size": 5,
    "total_elements": 6,
    "total_pages": 2
  }
}
```

Each entry carries `filename` and `filesize` only. `filesize` is the compressed size in bytes.

## 3. Download a feed file

Take a `filename` from step 2. You have two options.

**Option A: direct download (recommended)**

Follow the redirect to a presigned URL:

```bash
curl -L -o location.json.gz \
  "https://terra.tripadvisor.com/api/feeds/location.json.gz?version=1" \
  -H "X-API-Key: YOUR_FEED_API_KEY"
```

The `-L` flag follows the redirect and `-o` saves the file locally. The redirect target is S3. Some HTTP clients drop the `X-API-Key` header when they follow a redirect; that is fine, because the presigned URL carries its own authentication.

**Option B: fetch a temporary URL**

Use this when you need the URL for a later job:

```bash
curl "https://terra.tripadvisor.com/api/feeds/json/location.json.gz?version=1" \
  -H "X-API-Key: YOUR_FEED_API_KEY"
```

The response gives you:

* `url` — a presigned URL for downloading the file
* `exp` — the moment that URL stops working

Do not store the presigned URL. Store the filename and request a fresh URL when you need one.

## 4. Process your downloaded feed

```bash
# Decompress the gzipped file
gunzip location.json.gz

# The result is a JSON file ready for processing
cat location.json | jq '.'
```

## Feed file names

| Feed         | Filename                                                      |
| ------------ | ------------------------------------------------------------- |
| Locations    | `location.json.gz`                                            |
| Geos         | `geo.json.gz`                                                 |
| Photos       | `photo.json.gz`                                               |
| Reviews      | `review20260902.json.gz` — one file per day, dated `yyyyMMdd` |
| Enumerations | `enum_V1.json.gz`                                             |

Every file is gzipped, so every name ends in `.json.gz`. The enumerations feed is named for the API version it matches: `enum_V1.json.gz` for v1.

## Feed generation and retention

* Feeds are regenerated daily with fresh data.
* Files are kept for 12 days after generation. Download and store anything you need to keep longer.
* Feed versions are pinned to your account, not chosen per request. To move your feeds to a different API version, ask your account team to change your delivery configuration.

## Related

* [Using Enumerations](/docs/using-enumerations)
* [API Versioning & Compatibility](/docs/versioning-compatibility)
* [API Access and Limits](/docs/api-access-and-limits)
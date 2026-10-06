---
updatedAt: 2026-09-28T14:28:22.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# List Files

Get information on available Feed files to download.

## List Files requests

A List Files request returns the feed files currently available to your account. A filename from this response is required by both download endpoints.

Feed endpoints are served from a different base URL to the content endpoints, and use a separate feed API key.

A request is an HTTP GET to a URL in the form:

```
https://terra.tripadvisor.com/api/feeds/files/list
```

## List Files responses

The response is a paged object. Each entry in `data` carries `filename` and `filesize` only. `filesize` is the compressed size in bytes.

Pages are 1-based and `size` defaults to 5, so raise it when more files are expected.

```json
{
  "data": [
    { "filename": "location.json.gz", "filesize": 1048576 }
  ],
  "pagination": {
    "page": 1,
    "size": 5,
    "total_elements": 6,
    "total_pages": 2
  }
}
```

There is no last-modified field. Use the dated reviews filename to distinguish one day's file from another.

Note: feeds require the Innovate or Transform package and a feed configuration arranged with your account team.

Note: feed files are retained for a limited window after generation. See the [Guide for Downloading Feeds](/docs/download-a-feed) for filenames and retention.

## Examples

### List the available files

```bash
curl "https://terra.tripadvisor.com/api/feeds/files/list?version=1&size=20" \
  -H "X-API-Key: FEED_API_KEY"
```

## Related

* [Guide for Downloading Feeds](/docs/download-a-feed) — filenames, retention and the full workflow
* [Redirect to Feed File](/reference/getfile) — download immediately
* [Feed File URL](/reference/getfileurl) — retrieve a presigned URL instead

# OpenAPI definition

```json
{
  "openapi": "3.0.1",
  "info": {
    "description": "Collection of basic endpoints for the Feed API",
    "title": "Feed API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://terra.tripadvisor.com/api/feeds"
    }
  ],
  "paths": {
    "/files/list": {
      "get": {
        "description": "Get information on available Feed files to download.",
        "operationId": "listFiles",
        "parameters": [
          {
            "in": "query",
            "name": "page",
            "required": false,
            "schema": {
              "type": "integer",
              "format": "int32",
              "minimum": 0
            }
          },
          {
            "in": "query",
            "name": "size",
            "required": false,
            "schema": {
              "type": "integer",
              "format": "int32",
              "minimum": 1
            }
          },
          {
            "in": "query",
            "name": "sort",
            "required": false,
            "schema": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        ],
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PageFeedFileInfo"
                }
              }
            },
            "description": "available Feed Files information"
          }
        },
        "security": [
          {
            "ApiKeyAuth": []
          }
        ],
        "summary": "List Files",
        "tags": [
          "Feed File"
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "FeedFileInfo": {
        "type": "object",
        "properties": {
          "filename": {
            "type": "string",
            "description": "Name of the Feed file.",
            "example": "location.json.gz"
          },
          "filesize": {
            "type": "integer",
            "format": "int64",
            "description": "Size in bytes of the Feed file.",
            "example": 10420
          }
        },
        "required": [
          "filename",
          "filesize"
        ]
      },
      "PageFeedFileInfo": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/FeedFileInfo"
            }
          },
          "pagination": {
            "$ref": "#/components/schemas/PageMetadata"
          }
        },
        "required": [
          "data",
          "pagination"
        ]
      },
      "PageMetadata": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "format": "int32",
            "description": "Current page number (1-based)."
          },
          "size": {
            "type": "integer",
            "format": "int32",
            "description": "Number of items per page."
          },
          "total_elements": {
            "type": "integer",
            "format": "int64",
            "description": "Total number of elements"
          },
          "total_pages": {
            "type": "integer",
            "format": "int32",
            "description": "Total number of pages."
          }
        }
      }
    },
    "securitySchemes": {
      "ApiKeyAuth": {
        "in": "header",
        "name": "X-API-Key",
        "type": "apiKey"
      }
    }
  }
}
```
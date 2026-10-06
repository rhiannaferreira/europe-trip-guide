---
updatedAt: 2026-09-28T14:28:22.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Feed File URL

Get a temporary URL for downloading the file

## Feed File URL requests

A Feed File URL request takes a feed filename and returns a temporary presigned URL for downloading it. Use this when the download happens somewhere other than the process holding your API key — a worker, a scheduled job, a different host.

To download in a single step instead, use [Redirect to Feed File](/reference/getfile).

A request is an HTTP GET to a URL in the form:

```
https://terra.tripadvisor.com/api/feeds/json/{filename}
```

## Feed File URL responses

The response carries two fields, both always present:

| Field | Description                                   |
| ----- | --------------------------------------------- |
| `url` | The presigned URL for downloading the file.   |
| `exp` | The timestamp at which the URL stops working. |

```json
{
  "url": "https://s3.amazonaws.com/…?X-Amz-Signature=…",
  "exp": "2026-09-21T18:00:00Z"
}
```

Note: do not store the presigned URL. Store the filename and request a fresh URL when one is needed.

Note: the presigned URL carries its own authentication. Do not attach your API key to it, and treat it as a credential while it remains valid.

## Examples

### Retrieve a download URL

```bash
curl "https://terra.tripadvisor.com/api/feeds/json/location.json.gz?version=1" \
  -H "X-API-Key: FEED_API_KEY"
```

## Related

* [Guide for Downloading Feeds](/docs/download-a-feed)
* [List Files](/reference/listfiles) — to obtain a filename
* [Redirect to Feed File](/reference/getfile)

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
    "/json/{filename}": {
      "get": {
        "description": "Get a temporary URL for downloading the file",
        "operationId": "getFileUrl",
        "parameters": [
          {
            "description": "name of the file to get download data for",
            "in": "path",
            "name": "filename",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FeedDownloadUrl"
                }
              }
            },
            "description": "Feed file download data"
          },
          "400": {
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/ProblemDetail"
                }
              }
            },
            "description": "Bad Request"
          },
          "404": {
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/ProblemDetail"
                }
              }
            },
            "description": "Not Found"
          },
          "500": {
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/ProblemDetail"
                }
              }
            },
            "description": "Internal Server Error"
          }
        },
        "security": [
          {
            "ApiKeyAuth": []
          }
        ],
        "summary": "Feed File URL",
        "tags": [
          "Feed File"
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "FeedDownloadUrl": {
        "type": "object",
        "properties": {
          "exp": {
            "type": "string",
            "format": "date-time"
          },
          "url": {
            "type": "string"
          }
        },
        "required": [
          "exp",
          "url"
        ]
      },
      "FieldError": {
        "type": "object",
        "description": "Represents field validation errors",
        "properties": {
          "field": {
            "type": "string",
            "description": "The name of the field that failed the validation.",
            "example": "default_language"
          },
          "message": {
            "type": "string",
            "description": "The message about the failed validation rule.",
            "example": "size must be between 3 and 10"
          },
          "object_name": {
            "type": "string",
            "description": "The name of the object containing the invalid field.",
            "example": "apiConfiguration"
          },
          "rejected_value": {
            "type": "object",
            "description": "The actual value which was rejected.",
            "example": 1
          }
        }
      },
      "ProblemDetail": {
        "type": "object",
        "description": "Error response object. Can contain additional fields in some cases",
        "properties": {
          "detail": {
            "type": "string",
            "description": "Detail message describing the occurred problem.",
            "example": "The field default_language is invalid"
          },
          "field_errors": {
            "type": "array",
            "description": "Field Errors, filled with details about fields/parameters validation errors when happened. Optional.",
            "items": {
              "$ref": "#/components/schemas/FieldError"
            },
            "uniqueItems": true
          },
          "instance": {
            "type": "string",
            "format": "uri",
            "description": "The JSON string containing a URI reference that identifies the specific occurrence of the problem.",
            "example": "https://terra.tripadvisor.com/api/locations/123"
          },
          "message": {
            "type": "string",
            "description": "Additional message about the error. Optional.",
            "example": "Validation error"
          },
          "properties": {
            "type": "object",
            "additionalProperties": {
              "type": "object"
            },
            "writeOnly": true
          },
          "status": {
            "type": "integer",
            "format": "int32",
            "description": "The advisory JSON number indicating the HTTP status code.",
            "example": 400
          },
          "title": {
            "type": "string",
            "description": "The main message (title) of the problem.",
            "example": "Parameter is not valid"
          },
          "trace_id": {
            "type": "string",
            "description": "Trace (request) ID of the request caused the error.",
            "example": "f128ba49e"
          },
          "type": {
            "type": "string",
            "format": "uri",
            "description": "The type of the problem.\n See <a href=\"https://tripadvisor-content.readme.io/reference/errors\">the full list</a>.",
            "example": "https://tripadvisor-content.readme.io/reference/errors#constraint-violation"
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
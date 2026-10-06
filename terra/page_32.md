---
updatedAt: 2026-09-28T14:28:22.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Redirect to Feed File

Download a file through an automatic redirect to a secure presigned URL.

## Redirect to Feed File requests

A Redirect to Feed File request takes a feed filename and responds with a redirect to a presigned URL, so any client that follows redirects downloads the file in one step.

A request is an HTTP GET to a URL in the form:

```
https://terra.tripadvisor.com/api/feeds/{filename}
```

## Redirect to Feed File responses

The response is `302 Found` with the presigned URL in the `Location` header. There is no response body.

The client must follow redirects. A client configured not to follow them receives the `302` and no file. With curl, pass `-L` to follow the redirect and `-o` to save the result.

Note: some HTTP clients drop custom headers when following a redirect, so `X-API-Key` may not reach the storage host. This is expected — the presigned URL authenticates itself.

Note: feed files are gzipped, and every filename ends in `.json.gz`.

## Examples

### Download a feed file

```bash
curl -L -o location.json.gz \
  "https://terra.tripadvisor.com/api/feeds/location.json.gz?version=1" \
  -H "X-API-Key: FEED_API_KEY"
```

### Decompress and inspect it

```bash
gunzip location.json.gz
jq '.' location.json
```

## Related

* [Guide for Downloading Feeds](/docs/download-a-feed) — filenames, retention and decompressing
* [List Files](/reference/listfiles) — to obtain a filename
* [Feed File URL](/reference/getfileurl) — when the download happens elsewhere

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
    "/{filename}": {
      "get": {
        "description": "Download a file through an automatic redirect to a secure presigned URL.",
        "operationId": "getFile",
        "parameters": [
          {
            "description": "name of the file to download",
            "in": "path",
            "name": "filename",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "302": {
            "description": "redirect to a location for downloading"
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
        "summary": "Redirect to Feed File",
        "tags": [
          "Feed File"
        ]
      }
    }
  },
  "components": {
    "schemas": {
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
---
updatedAt: 2026-09-22T17:00:06.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Get Location allowlist IDs.

Get Location allowlist IDs.

## Get Allowlist requests

A Get Allowlist request returns the Tripadvisor Location IDs your key is licensed to retrieve. This is the set the Location endpoints and your feeds honour.

A request is an HTTP GET to a URL in the form:

```
https://terra.tripadvisor.com/api/allowlist
```

## Get Allowlist responses

The response is a paged object whose `data` array contains bare integers — Location IDs, not objects. The `pagination` object carries `page`, `size`, `total_elements` and `total_pages`.

Pages are 1-based and `size` defaults to 1000, so a large portfolio still requires paging.

```json
{
  "data": [187147, 188151, 190420],
  "pagination": {
    "page": 1,
    "size": 1000,
    "total_elements": 3,
    "total_pages": 1
  }
}
```

Note: an ID absent from this list returns `404` from [Location Details](/reference/locationget). The Catalog endpoints ignore the allowlist, which is how IDs are found before being added.

## Examples

### Read the first page of the allowlist

```bash
curl "https://terra.tripadvisor.com/api/allowlist?version=1" \
  -H "X-API-Key: API_KEY"
```

### Read a smaller page

```bash
curl "https://terra.tripadvisor.com/api/allowlist?version=1&page=1&size=100" \
  -H "X-API-Key: API_KEY"
```

## Related

* [Guide for Managing Allowed Locations](/docs/guide-for-managing-allowed-locations) — the full workflow
* [Update the allowlist](/reference/uploadallowlist)
* [Search Locations Catalog](/reference/cataloglocationssearch) — finding IDs to add

# OpenAPI definition

```json
{
  "openapi": "3.0.1",
  "info": {
    "description": "Account API manages account configurations for API access and Feed generation",
    "title": "Account API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://terra.tripadvisor.com/api"
    }
  ],
  "tags": [
    {
      "description": "Endpoints for managing the allowlist of location IDs",
      "name": "Allowlist"
    }
  ],
  "paths": {
    "/allowlist": {
      "get": {
        "description": "Get Location allowlist IDs.",
        "operationId": "getAllowlist",
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
                  "$ref": "#/components/schemas/PageInteger"
                }
              }
            },
            "description": "location IDs from the allowlist"
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
        "summary": "Get Location allowlist IDs.",
        "tags": [
          "Allowlist"
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
      "PageInteger": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "type": "integer",
              "format": "int32"
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
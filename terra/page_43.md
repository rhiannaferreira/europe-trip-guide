---
updatedAt: 2026-09-22T17:00:16.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Add, remove, or replace location IDs on the allowlist, depending on the request's operation type.

Add, remove, or replace location IDs on the allowlist, depending on the request's operation type.

## Update Allowlist requests

An Update Allowlist request takes an operation type and a list of Tripadvisor Location IDs, and applies them to your existing allowlist. Update Allowlist only supports POST requests.

A request is an HTTP POST to a URL in the form:

```
https://terra.tripadvisor.com/api/allowlist
```

Pass the operation type and IDs in the JSON request body:

```bash
curl -X POST "https://terra.tripadvisor.com/api/allowlist?version=1" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: API_KEY" \
  -d '{ "operation_type": "APPEND", "allowlist": [187147, 188151] }'
```

### operation\_type

| Value       | Effect                                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `APPEND`    | Adds the submitted IDs. IDs already present are left unchanged. IDs on the allowlist but absent from the request are unaffected. |
| `DELETE`    | Removes the submitted IDs. IDs not on the allowlist have nothing to remove. Other IDs are unaffected.                            |
| `OVERWRITE` | Replaces the entire allowlist with the submitted IDs. Any ID previously on the allowlist but absent from the request is removed. |

## Update Allowlist responses

The response carries three counts: `added`, `deleted` and `no_change`.

How they sum depends on the operation:

* For `APPEND`, `added + deleted + no_change` equals the number of IDs submitted.
* For `DELETE`, an ID that was never on the allowlist is not counted, so the sum may be **less** than the number submitted.
* For `OVERWRITE`, `deleted` counts existing allowlist IDs that were **absent** from the request rather than IDs submitted, so the sum may **exceed** the number submitted.

```json
{ "added": 2, "deleted": 0, "no_change": 0 }
```

Note: `OVERWRITE` with an empty `allowlist` empties the allowlist. There is no confirmation step.

Note: changes take effect immediately. An added Location is retrievable on the next call; a removed Location returns `404` at once.

Note: this endpoint is rate-limited separately from content endpoints and returns `429` when exceeded. Batch changes into one request rather than sending one ID per request.

## Examples

### Add two Locations

```bash
curl -X POST "https://terra.tripadvisor.com/api/allowlist?version=1" \
  -H "Content-Type: application/json" -H "X-API-Key: API_KEY" \
  -d '{ "operation_type": "APPEND", "allowlist": [187147, 188151] }'
```

### Remove a Location

```bash
curl -X POST "https://terra.tripadvisor.com/api/allowlist?version=1" \
  -H "Content-Type: application/json" -H "X-API-Key: API_KEY" \
  -d '{ "operation_type": "DELETE", "allowlist": [187147] }'
```

### Replace the entire allowlist

```bash
curl -X POST "https://terra.tripadvisor.com/api/allowlist?version=1" \
  -H "Content-Type: application/json" -H "X-API-Key: API_KEY" \
  -d '{ "operation_type": "OVERWRITE", "allowlist": [190420, 190421] }'
```

## Related

* [Guide for Managing Allowed Locations](/docs/guide-for-managing-allowed-locations)
* [Read the allowlist](/reference/getallowlist)
* [Moving from Legacy "Mapping"](/docs/faq-migrating-from-legacy-mapping-partner-api)

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
      "post": {
        "description": "Add, remove, or replace location IDs on the allowlist, depending on the request's operation type.",
        "operationId": "uploadAllowlist",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UploadAllowlistRequest"
              }
            }
          },
          "description": "operation type and location IDs to apply to the allowlist",
          "required": true
        },
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UploadAllowlistResponse"
                }
              }
            },
            "description": "counts of location IDs added, deleted, or left unchanged as a result of the request"
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
          "429": {
            "content": {
              "application/problem+json": {
                "schema": {
                  "$ref": "#/components/schemas/ProblemDetail"
                }
              }
            },
            "description": "Too Many Requests"
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
        "summary": "Add, remove, or replace location IDs on the allowlist, depending on the request's operation type.",
        "tags": [
          "Allowlist"
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "AllowlistOperationType": {
        "type": "string",
        "description": "How the <code>allowlist</code> location IDs in an upload request should be applied to a partner config's\n existing allowlist.",
        "enum": [
          "APPEND",
          "DELETE",
          "OVERWRITE"
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
      },
      "UploadAllowlistRequest": {
        "type": "object",
        "description": "Request payload for adding, removing, or replacing location IDs on a partner config's allowlist.",
        "properties": {
          "allowlist": {
            "type": "array",
            "description": "Location IDs to add, remove, or use as the full replacement allowlist, depending on\n <code>operationType</code>.",
            "items": {
              "type": "integer",
              "format": "int32"
            },
            "uniqueItems": true
          },
          "operation_type": {
            "$ref": "#/components/schemas/AllowlistOperationType"
          }
        },
        "required": [
          "operation_type"
        ]
      },
      "UploadAllowlistResponse": {
        "type": "object",
        "description": "Counts of how location IDs were classified while applying an allowlist update.\n\n <p>For <code>APPEND</code> requests the sum <code>added + deleted + noChange</code> equals the number of\n submitted IDs.\n\n <p>For <code>DELETE</code> requests an ID that was never on the allowlist has nothing to remove and is\n not counted, so the sum may be <em>less</em> than the number of submitted IDs.\n\n <p>For <code>OVERWRITE</code> requests the <code>deleted</code> count reflects existing allowlist IDs that\n were <em>absent</em> from the request (and therefore removed), not submitted IDs. The sum may\n therefore <em>exceed</em> the number of submitted IDs.",
        "properties": {
          "added": {
            "type": "integer",
            "format": "int64",
            "description": "Number of submitted location IDs that were not already on the allowlist and have been added."
          },
          "deleted": {
            "type": "integer",
            "format": "int64",
            "description": "Number of location IDs removed from the allowlist. For <code>OVERWRITE</code> this counts existing\n allowlist IDs absent from the request, not submitted IDs."
          },
          "no_change": {
            "type": "integer",
            "format": "int64",
            "description": "Number of submitted location IDs that already matched the desired allowlist state and required no\n change."
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
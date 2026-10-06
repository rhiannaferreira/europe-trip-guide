---
updatedAt: 2026-09-28T14:28:19.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Location Photos

Retrieves photos for a Tripadvisor Location.

 <p>Returns a page of high-resolution images contributed by both travelers and management, sorted with
 the most recent first. Each photo includes dynamic CDN references, the contributor source, an optional
 caption, and (for eligible partners) computer-vision metadata such as scene classification and an
 attractiveness score.

## Location Photos requests

A Location Photos request takes a Tripadvisor Location ID and returns a page of photos for that Location, most recent first. Photos are contributed by both travelers and management (listing owners).

A request is an HTTP GET to a URL in the form:

```
https://terra.tripadvisor.com/api/locations/{id}/photos
```

## Location Photos responses

The response is a paged object. The `data` array contains the photos, each with CDN references, the contributor source, an optional caption and, for eligible packages, computer-vision metadata.

Pages are 1-based and `size` defaults to 100 — higher than the other paged endpoints. Request only what you will display.

`source.name` is `Traveler` or `Management`. Management photos are generally the ones to use as a lead image; there is no parameter to filter by source, so filter client-side.

`cv_metadata` is absent unless your package includes it. Treat its absence as expected rather than an error.

`locale` selects the caption language.

Note: `original_size_url` is a CDN URL. Do not download and re-host the image. Request the size you need using the CDN's resizing parameters.

Note: every photo display requires a link to Tripadvisor. See [Linking Policy](/docs/linking-policy).

## Examples

### Retrieve the first 20 photos

```bash
curl "https://terra.tripadvisor.com/api/locations/187147/photos?version=1&size=20" \
  -H "X-API-Key: API_KEY"
```

### Retrieve photos with Spanish captions

```bash
curl "https://terra.tripadvisor.com/api/locations/187147/photos?version=1&locale=es-MX" \
  -H "X-API-Key: API_KEY"
```

## Related

* [Location Details](/reference/locationget) — `photos.total_count` before you page
* [Brand Guidelines](/docs/display-requirements) — display requirements for imagery
* [Caching Policy](/docs/caching-policy)

# OpenAPI definition

```json
{
  "openapi": "3.0.1",
  "info": {
    "description": "Collection of basic endpoints for the Partner API",
    "title": "Partner API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://terra.tripadvisor.com/api"
    }
  ],
  "paths": {
    "/locations/{id}/photos": {
      "get": {
        "description": "Retrieves photos for a Tripadvisor Location.\n\n <p>Returns a page of high-resolution images contributed by both travelers and management, sorted with\n the most recent first. Each photo includes dynamic CDN references, the contributor source, an optional\n caption, and (for eligible partners) computer-vision metadata such as scene classification and an\n attractiveness score.",
        "operationId": "locationPhotosGet",
        "parameters": [
          {
            "description": "the Tripadvisor Location ID to retrieve photos for",
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int32"
            }
          },
          {
            "description": "preferred locales for localized fields (e.g. captions), in priority order; falls back\n                 to the default locale when omitted",
            "in": "query",
            "name": "locale",
            "required": false,
            "schema": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
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
                  "$ref": "#/components/schemas/PagePhoto"
                }
              }
            },
            "description": "a page of photos for the Location"
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
        "summary": "Location Photos",
        "tags": [
          "Location"
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "CVMetadata": {
        "type": "object",
        "properties": {
          "attractiveness_score": {
            "type": "number",
            "description": "Computer vision attractiveness score ranging from 0.0 to 1.0 (higher is more attractive)",
            "exclusiveMaximum": false,
            "exclusiveMinimum": false,
            "maximum": 1,
            "minimum": 0
          },
          "scene": {
            "type": "string",
            "description": "One of:\n <ul>\n     <li>spa</li>\n     <li>bathroom</li>\n     <li>food</li>\n     <li>interior</li>\n     <li>view</li>\n     <li>dining</li>\n     <li>menu</li>\n     <li>beach</li>\n     <li>exterior</li>\n     <li>business_ce</li>\n     <li>room</li>\n     <li>other</li>\n     <li>drinks</li>\n     <li>common_area</li>\n     <li>fitness_cen</li>\n     <li>kid_areas</li>\n     <li>pool</li>\n </ul>"
          }
        }
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
      "ImageUrl": {
        "type": "object",
        "properties": {
          "key": {
            "type": "string",
            "description": "Unique identifier for the image"
          },
          "url": {
            "type": "string",
            "description": "URL to access the image"
          }
        }
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
      "PagePhoto": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Photo"
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
      "Photo": {
        "type": "object",
        "properties": {
          "caption": {
            "type": "string",
            "description": "Caption text describing the photo"
          },
          "cv_metadata": {
            "$ref": "#/components/schemas/CVMetadata"
          },
          "id": {
            "type": "integer",
            "format": "int32",
            "description": "Unique identifier for the photo"
          },
          "location_id": {
            "type": "integer",
            "format": "int32",
            "description": "Location ID that is related to the photo"
          },
          "photo": {
            "$ref": "#/components/schemas/PhotoInfo"
          },
          "publish_ts": {
            "type": "string",
            "format": "date-time",
            "description": "Date and time when the photo was published"
          },
          "source": {
            "$ref": "#/components/schemas/PhotoSource"
          },
          "user": {
            "$ref": "#/components/schemas/UserInfo"
          }
        },
        "required": [
          "id",
          "location_id",
          "photo",
          "publish_ts",
          "source"
        ]
      },
      "PhotoInfo": {
        "type": "object",
        "properties": {
          "key": {
            "type": "string",
            "description": "Unique identifier for the photo"
          },
          "media_type": {
            "type": "string",
            "description": "Media type of the photo (e.g., \"image/jpeg\", \"image/png\")"
          },
          "original_height": {
            "type": "integer",
            "format": "int32",
            "description": "Original height of the photo in pixels"
          },
          "original_size_url": {
            "type": "string",
            "description": "URL to the original size photo"
          },
          "original_width": {
            "type": "integer",
            "format": "int32",
            "description": "Original width of the photo in pixels"
          }
        }
      },
      "PhotoSource": {
        "type": "object",
        "properties": {
          "name": {
            "$ref": "#/components/schemas/PhotoSourceName"
          }
        },
        "required": [
          "name"
        ]
      },
      "PhotoSourceName": {
        "type": "string",
        "enum": [
          "Management",
          "Traveler"
        ]
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
      "UserInfo": {
        "type": "object",
        "properties": {
          "avatar_url": {
            "$ref": "#/components/schemas/ImageUrl"
          },
          "geo": {
            "type": "string",
            "description": "Name of the geographic location associated with the user"
          },
          "geo_id": {
            "type": "integer",
            "format": "int32",
            "description": "Geographic ID associated with the user's location"
          },
          "username": {
            "type": "string",
            "description": "Username of the user"
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
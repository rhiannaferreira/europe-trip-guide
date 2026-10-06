---
updatedAt: 2026-09-28T14:28:19.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Search Nearby Locations Catalog

Searches the Location catalog for points of interest within a geographic area, ordered by proximity
 or rating.

 <p>The search area is defined either by a center point and radius or by a bounding box, supplied via
 the <code>search</code> parameters. This endpoint is not limited by a partner's allowlist or geofencing, but
 each result returns only the lightweight catalog projection of a Location.

## Search Nearby Locations Catalog requests

A Search Nearby Locations Catalog request takes a geographic area and returns Locations within it from the whole Tripadvisor catalogue, ordered by proximity or rating. Unlike [Search Nearby Locations](/reference/locationsnearbyget), it is not restricted by your allowlist or geofencing, and each result carries only a lightweight projection.

The search area is defined the same three ways, and the strategies are mutually exclusive:

| Strategy                 | Parameters                             |
| ------------------------ | -------------------------------------- |
| Radius around a point    | `lat`, `lon`, `radius`, `unit`         |
| Radius around a Location | `location_id`, `radius`, `unit`        |
| Bounding box             | `sw_lat`, `sw_lon`, `ne_lat`, `ne_lon` |

A request is an HTTP GET to a URL in the form:

```
https://terra.tripadvisor.com/api/catalog/locations/nearby
```

## Search Nearby Locations Catalog responses

The response is a paged object. Each entry carries the lightweight catalogue projection plus its distance and bearing from the center point. Pages are 1-based.

## Search parameters

`radius`, `unit`, the bounding-box corners and `min_rating` behave exactly as on [Search Nearby Locations](/reference/locationsnearbyget), including the radius maximum of 8 KM or 5 MI and the requirement that `sw_lat` be less than `ne_lat`.

### sort

`rating,desc` by default. Sorting by `distance` is available for radius searches only, not for bounding boxes.

## Limits

`size` must not exceed 20 and defaults to 20. A larger value returns `400`.

This endpoint has no offset ceiling, so it can be paged further than [Search Nearby Locations](/reference/locationsnearbyget), which stops at an offset of 40.

Note: a result here is not a licence. Add the ID to your allowlist before calling the Location endpoints for it.

Note: counts against the same lower search rate limit as every other search and nearby endpoint. See [API Access and Limits](/docs/api-access-and-limits).

## Examples

### Find everything within 1 km of a point

```bash
curl "https://terra.tripadvisor.com/api/catalog/locations/nearby?version=1&lat=48.85&lon=2.33&radius=1&unit=KM" \
  -H "X-API-Key: API_KEY"
```

### Find highly rated accommodations in a bounding box

```bash
curl "https://terra.tripadvisor.com/api/catalog/locations/nearby?version=1&sw_lat=48.84&sw_lon=2.32&ne_lat=48.87&ne_lon=2.37&category=HOTEL&min_rating=4" \
  -H "X-API-Key: API_KEY"
```

## Related

* [Search Nearby Locations](/reference/locationsnearbyget) — allowlist-scoped, full records, with an offset ceiling
* [Search Locations Catalog](/reference/cataloglocationssearch) — by text instead of geography
* [Guide for Managing Allowed Locations](/docs/guide-for-managing-allowed-locations)

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
    "/catalog/locations/nearby": {
      "get": {
        "description": "Searches the Location catalog for points of interest within a geographic area, ordered by proximity\n or rating.\n\n <p>The search area is defined either by a center point and radius or by a bounding box, supplied via\n the <code>search</code> parameters. This endpoint is not limited by a partner's allowlist or geofencing, but\n each result returns only the lightweight catalog projection of a Location.",
        "operationId": "catalogLocationsNearbyGet",
        "parameters": [
          {
            "description": "The ID of the Location to use as a reference for the radius-based search.\n <p>\n Required if `lat` or `lon` is not given.",
            "example": 23555902,
            "in": "query",
            "name": "location_id",
            "required": false,
            "schema": {
              "type": "string",
              "example": 23555902
            }
          },
          {
            "description": "The latitude of the center point for the radius-based search.\n <p>\n Required if `location_id` not given.",
            "in": "query",
            "name": "lat",
            "required": false,
            "schema": {
              "type": "number",
              "exclusiveMaximum": false,
              "exclusiveMinimum": false,
              "maximum": 90,
              "minimum": -90
            }
          },
          {
            "description": "The longitude of the center point for the radius-based search.\n <p>\n Required if `location_id` not given.",
            "in": "query",
            "name": "lon",
            "required": false,
            "schema": {
              "type": "number",
              "exclusiveMaximum": false,
              "exclusiveMinimum": false,
              "maximum": 180,
              "minimum": -180
            }
          },
          {
            "description": "The radius for the radius-based search.\n <p>\n Required if \"Bounding Box\" criteria is not given (`sw_lat`, `sw_lon`, `ne_lat`, `ne_lon`).",
            "in": "query",
            "name": "radius",
            "required": false,
            "schema": {
              "type": "number",
              "format": "double",
              "exclusiveMinimum": true,
              "minimum": 0
            }
          },
          {
            "description": "Unit of length for distance. If none specified defaults to miles.",
            "example": "KM",
            "in": "query",
            "name": "unit",
            "required": false,
            "schema": {
              "type": "string",
              "default": "MI",
              "example": "KM"
            }
          },
          {
            "description": "Bounding Box southwest latitude coordinate.\n <p>\n Required if `radius` is not given.",
            "in": "query",
            "name": "sw_lat",
            "required": false,
            "schema": {
              "type": "string",
              "maximum": 90,
              "minimum": -90
            }
          },
          {
            "description": "Bounding Box southwest longitude coordinate.\n <p>\n Required if `radius` is not given.",
            "in": "query",
            "name": "sw_lon",
            "required": false,
            "schema": {
              "type": "string",
              "maximum": 180,
              "minimum": -180
            }
          },
          {
            "description": "Bounding Box northeast latitude coordinate.\n <p>\n Required if `radius` is not given.",
            "in": "query",
            "name": "ne_lat",
            "required": false,
            "schema": {
              "type": "string",
              "maximum": 90,
              "minimum": -90
            }
          },
          {
            "description": "Bounding Box northeast longitude coordinate.\n <p>\n Required if `radius` is not given.",
            "in": "query",
            "name": "ne_lon",
            "required": false,
            "schema": {
              "type": "string",
              "maximum": 180,
              "minimum": -180
            }
          },
          {
            "description": "Filter based on Tripadvisor’s top-level categories (eat & drink, accommodations, attractions).",
            "in": "query",
            "name": "category",
            "required": false,
            "schema": {
              "$ref": "#/components/schemas/CategoryType"
            }
          },
          {
            "description": "Filter by ratings with at least N bubbles (1.0-5.0).",
            "in": "query",
            "name": "min_rating",
            "required": false,
            "schema": {
              "type": "string",
              "maximum": 5,
              "minimum": 1
            }
          },
          {
            "description": "preferred locales for localized fields (e.g. names, descriptions), in priority order;\n                 falls back to the default locale when omitted",
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
            "description": "Page index (1-based).",
            "in": "query",
            "name": "page",
            "schema": {
              "type": "integer",
              "minimum": 1
            }
          },
          {
            "description": "Page size.",
            "in": "query",
            "name": "size",
            "schema": {
              "type": "integer",
              "default": 20,
              "maximum": 20
            }
          },
          {
            "description": "Sorting criteria in the format: property,(asc|desc). Multiple sort criteria are supported. Available sorting: `distance` (for radius-based search only), `rating`",
            "in": "query",
            "name": "sort",
            "schema": {
              "type": "array",
              "default": [
                "rating,desc"
              ],
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
                  "$ref": "#/components/schemas/PageNearbyCatalogLocation"
                }
              }
            },
            "description": "a page of catalog Locations within the requested area, each annotated with its distance and\n         bearing from the search center"
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
        "summary": "Search Nearby Locations Catalog",
        "tags": [
          "Catalog"
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "Address": {
        "type": "object",
        "properties": {
          "city": {
            "type": "string",
            "description": "City or municipality name"
          },
          "country_code": {
            "type": "string",
            "description": "ISO 3166-1 alpha-2 country code (e.g., \"US\", \"CA\", \"GB\")"
          },
          "country_name": {
            "type": "string",
            "description": "Full country name"
          },
          "formatted": {
            "type": "string",
            "description": "Complete formatted address string"
          },
          "language": {
            "type": "string",
            "description": "Language code for the address text (e.g., \"en\", \"es\", \"fr\")"
          },
          "postal_code": {
            "type": "string",
            "description": "Postal or ZIP code"
          },
          "state": {
            "type": "string",
            "description": "State, province, or region name"
          },
          "street_address": {
            "type": "string",
            "description": "Primary street address line containing building number and street name"
          },
          "street_address2": {
            "type": "string",
            "description": "Secondary street address line for apartment, suite, or unit information"
          }
        }
      },
      "CatalogLocation": {
        "type": "object",
        "description": "A lightweight representation of a Tripadvisor Location returned by the Catalog endpoints.\n\n <p>The Catalog endpoints expose only this reduced set of fields. Use the <code>id</code> to look up the full\n Location details via the Location endpoints when you are licensed for that Location.",
        "properties": {
          "addresses": {
            "type": "array",
            "description": "Postal addresses for the Location, including a pre-formatted single-line representation per language.",
            "items": {
              "$ref": "#/components/schemas/Address"
            }
          },
          "coordinates": {
            "$ref": "#/components/schemas/Coordinates"
          },
          "descriptions": {
            "type": "array",
            "description": "Editorial descriptions of the Location, provided in one or more languages.",
            "items": {
              "$ref": "#/components/schemas/Translation"
            }
          },
          "geo": {
            "type": "string",
            "description": "Display name of the Geo that this Location belongs to (e.g. <code>&quot;Lisbon&quot;</code>)."
          },
          "geo_id": {
            "type": "integer",
            "format": "int32",
            "description": "Identifier of the Tripadvisor Geo (e.g. city or region) that this Location belongs to."
          },
          "id": {
            "type": "integer",
            "format": "int32",
            "description": "Tripadvisor's unique identifier for this Location."
          },
          "names": {
            "type": "array",
            "description": "The Location's name in one or more languages. One name per language is flagged as the primary name.",
            "items": {
              "$ref": "#/components/schemas/TranslationWithPrimary"
            }
          },
          "overall_rating": {
            "$ref": "#/components/schemas/Overall"
          },
          "urls": {
            "$ref": "#/components/schemas/Urls"
          }
        },
        "required": [
          "descriptions",
          "geo",
          "geo_id",
          "id",
          "names"
        ]
      },
      "CategoryType": {
        "type": "string",
        "enum": [
          "RESTAURANT",
          "ATTRACTION",
          "HOTEL"
        ]
      },
      "Coordinates": {
        "type": "object",
        "properties": {
          "latitude": {
            "type": "number",
            "description": "Geographic latitude coordinate in decimal degrees (-90 to 90)"
          },
          "longitude": {
            "type": "number",
            "description": "Geographic longitude coordinate in decimal degrees (-180 to 180)"
          }
        },
        "required": [
          "latitude",
          "longitude"
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
      "NearbyCatalogLocation": {
        "type": "object",
        "description": "A single result from the Nearby Locations Catalog search: a catalog Location paired with its position\n relative to the search center.",
        "properties": {
          "bearing": {
            "type": "number",
            "format": "double",
            "description": "The initial bearing (forward azimuth) from search center to the Location coordinates."
          },
          "distance_kilometers": {
            "type": "number",
            "format": "double",
            "description": "Distance (in kilometers) from search center to the Location coordinates."
          },
          "distance_miles": {
            "type": "number",
            "format": "double",
            "description": "Distance (in miles) from search center to the Location coordinates."
          },
          "location": {
            "$ref": "#/components/schemas/CatalogLocation"
          }
        }
      },
      "Overall": {
        "type": "object",
        "properties": {
          "count": {
            "type": "integer",
            "format": "int32",
            "description": "Total number of reviews contributing to this rating"
          },
          "icon_url": {
            "type": "string",
            "description": "URL to the rating icon/image"
          },
          "rating": {
            "type": "number",
            "description": "Overall rating score (typically 1.0 to 5.0)"
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
      "PageNearbyCatalogLocation": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/NearbyCatalogLocation"
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
      "Translation": {
        "type": "object",
        "properties": {
          "language": {
            "type": "string",
            "description": "Language code for the translation (e.g., \"en\", \"es\", \"fr\")"
          },
          "value": {
            "type": "string",
            "description": "Translated text content in the specified language"
          }
        },
        "required": [
          "language",
          "value"
        ]
      },
      "TranslationWithPrimary": {
        "type": "object",
        "properties": {
          "language": {
            "type": "string",
            "description": "Language code for the translation (e.g., \"en\", \"es\", \"fr\")"
          },
          "primary": {
            "type": "boolean",
            "description": "Indicates if this is the primary language version of the text"
          },
          "value": {
            "type": "string",
            "description": "Translated text content in the specified language"
          }
        },
        "required": [
          "language",
          "value"
        ]
      },
      "Tripadvisor": {
        "type": "object",
        "properties": {
          "main": {
            "type": "string"
          },
          "photos": {
            "type": "string"
          },
          "questions_answers": {
            "type": "string"
          },
          "write_review": {
            "type": "string"
          }
        }
      },
      "Urls": {
        "type": "object",
        "properties": {
          "android_intent": {
            "type": "string"
          },
          "menu": {
            "type": "string"
          },
          "official": {
            "type": "string"
          },
          "tripadvisor": {
            "$ref": "#/components/schemas/Tripadvisor"
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
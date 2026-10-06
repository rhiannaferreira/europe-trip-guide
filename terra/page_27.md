---
updatedAt: 2026-09-28T14:28:19.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Search Locations Catalog

Searches the Location catalog by free-text name or address.

 <p>Use this endpoint to resolve a textual query (for example a business name or street address) into
 matching Tripadvisor Locations. This endpoint is not limited by a partner's allowlist or geofencing,
 but each result returns only the lightweight catalog projection of a Location.

## Search Locations Catalog requests

A Search Locations Catalog request takes a free-text query and returns matching Locations from the whole Tripadvisor catalogue. Unlike [Search Locations](/reference/locationssearch), it is not restricted by your allowlist or geofencing, and each result carries only a lightweight projection of a Location.

Use it to resolve names and addresses into Tripadvisor Location IDs, then pass those IDs to the Location endpoints.

A request is an HTTP GET to a URL in the form:

```
https://terra.tripadvisor.com/api/catalog/locations/search
```

## Search Locations Catalog responses

The response is a paged object. Each entry in `data` carries the Location ID, names, addresses, coordinates, descriptions, overall rating and Tripadvisor URLs. Photos, categories, opening hours and reviews are not included — retrieve those from [Location Details](/reference/locationget) once the ID is on your allowlist.

Pages are 1-based.

## Search parameters

Identical to [Search Locations](/reference/locationssearch): `query` (1 to 500 characters, required), `search_type` (`NAME`, `ADDRESS`, `COMBINED`), `country_code` (upper-case alpha-2), `geo_name`, `postal_code` and `category` (`RESTAURANT`, `ATTRACTION`, `HOTEL`).

## Limits

`size` must not exceed 20 and defaults to 20. A larger value returns `400`.

Note: a result here is not a licence. Finding a Location in the catalogue does not make it retrievable from [Location Details](/reference/locationget) — add the ID to your allowlist first, or the request returns `404`.

Note: the catalogue endpoints count against the same lower search rate limit as the Location search endpoints. They are intended for configuration and admin workflows rather than end-user traffic. See [API Access and Limits](/docs/api-access-and-limits).

Note: the Catalog and Location read endpoints share a single permission. A key that can call one can call the other.

## Examples

### Resolve a hotel name to a Location ID

```bash
curl "https://terra.tripadvisor.com/api/catalog/locations/search?version=1&query=Hotel%20Lutetia&geo_name=Paris" \
  -H "X-API-Key: API_KEY"
```

### Check whether an address exists in the catalogue

```bash
curl "https://terra.tripadvisor.com/api/catalog/locations/search?version=1&query=45%20Boulevard%20Raspail&search_type=ADDRESS&country_code=FR" \
  -H "X-API-Key: API_KEY"
```

## Related

* [Guide for Managing Allowed Locations](/docs/guide-for-managing-allowed-locations) — what to do with the IDs you resolve
* [Search Locations](/reference/locationssearch) — the allowlist-scoped equivalent, with full records
* [Get Catalog Location](/reference/cataloglocationget) — when the ID is already known

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
    "/catalog/locations/search": {
      "get": {
        "description": "Searches the Location catalog by free-text name or address.\n\n <p>Use this endpoint to resolve a textual query (for example a business name or street address) into\n matching Tripadvisor Locations. This endpoint is not limited by a partner's allowlist or geofencing,\n but each result returns only the lightweight catalog projection of a Location.",
        "operationId": "catalogLocationsSearch",
        "parameters": [
          {
            "description": "Text search query.",
            "in": "query",
            "name": "query",
            "required": true,
            "schema": {
              "type": "string",
              "maxLength": 500,
              "minLength": 1
            }
          },
          {
            "description": "Searching type.",
            "in": "query",
            "name": "search_type",
            "required": false,
            "schema": {
              "type": "string",
              "default": "NAME"
            }
          },
          {
            "description": "Alpha-2 country code.",
            "example": "UA",
            "in": "query",
            "name": "country_code",
            "required": false,
            "schema": {
              "type": "string",
              "example": "UA",
              "pattern": "^[A-Z]{2}$"
            }
          },
          {
            "description": "City, Town, or Country Geo Name.",
            "example": "Ukraine",
            "in": "query",
            "name": "geo_name",
            "required": false,
            "schema": {
              "type": "string",
              "example": "Ukraine"
            }
          },
          {
            "description": "Postal/zip code to further narrow results.\n <p>\n If both `geo_name` and `postal_code` are given, the `postal_code` takes precedence in case they do not resolve.",
            "example": 76019,
            "in": "query",
            "name": "postal_code",
            "required": false,
            "schema": {
              "type": "string",
              "example": 76019
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
            "description": "preferred locales for localized fields (e.g. names, descriptions), in priority order;\n               falls back to the default locale when omitted",
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
          }
        ],
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PageSearchCatalogLocation"
                }
              }
            },
            "description": "a page of catalog Locations matching the query, each annotated with the value that matched"
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
        "summary": "Search Locations Catalog",
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
      "PageSearchCatalogLocation": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/SearchCatalogLocation"
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
      "SearchCatalogLocation": {
        "type": "object",
        "description": "A single result from the Locations Catalog search: a catalog Location paired with the text that matched\n the query.",
        "properties": {
          "location": {
            "$ref": "#/components/schemas/CatalogLocation"
          },
          "matched_value": {
            "$ref": "#/components/schemas/Translation"
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
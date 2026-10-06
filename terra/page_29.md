---
updatedAt: 2026-09-28T14:28:19.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Geo Details

Retrieves the factual and rich details of a single Tripadvisor Geo by its ID.

## Geo Details requests

A Geo Details request takes a Tripadvisor Geo ID and returns that destination — a country, region, city or neighbourhood. Every Location carries a `geo_id`, which is how a Location is resolved to the destination that contains it.

A request is an HTTP GET to a URL in the form:

```
https://terra.tripadvisor.com/api/geos/{id}
```

## Geo Details responses

The response is a single Geo object containing localized names and descriptions, the ancestor hierarchy, coordinates, the Geo type, Tripadvisor landing-page URLs, forum FAQs and suggested itineraries.

### hierarchy

`hierarchy.ancestors` is ordered from the top of the tree down: `rank` 0 is the broadest ancestor and the final entry is the immediate parent. Walk the array in order to build breadcrumbs.

### urls

Separate landing pages are provided for the destination itself and for hotels, restaurants, things to do and flights. Use the supplied URL rather than constructing one.

### suggested\_itineraries

`trip_creation_method` indicates how an itinerary was produced and may be `GENERATIVE_AI`. AI-generated content shown to users requires the disclosure your Master Terms specify.

### Locales

`locale` behaves as on [Location Details](/reference/locationget): repeatable for translated text, first locale only for enum labels.

Note: `collections` is deprecated and will be removed in a future major version.

## Examples

### Retrieve a destination

```bash
curl "https://terra.tripadvisor.com/api/geos/187147?version=1&locale=en-US" \
  -H "X-API-Key: API_KEY"
```

## Related

* [Multiple Geos Details](/reference/geosget) — several destinations in one call
* [Location Details](/reference/locationget) — the source of `geo_id`
* [Supported Locales](/docs/locales)

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
    "/geos/{id}": {
      "get": {
        "description": "Retrieves the factual and rich details of a single Tripadvisor Geo by its ID.",
        "operationId": "geoGet",
        "parameters": [
          {
            "description": "the Tripadvisor Geo ID to retrieve",
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int32"
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
          }
        ],
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Geo"
                }
              }
            },
            "description": "the requested Geo's details"
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
        "summary": "Geo Details",
        "tags": [
          "Geo"
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "Ancestor": {
        "type": "object",
        "properties": {
          "geo_id": {
            "type": "integer",
            "format": "int32",
            "description": "Ancestor geo id"
          },
          "name": {
            "type": "string",
            "description": "Display name of the ancestor"
          },
          "rank": {
            "type": "integer",
            "format": "int32",
            "description": "Position in hierarchy (0 = topmost ancestor)"
          }
        }
      },
      "AwardV1": {
        "type": "object",
        "properties": {
          "category": {
            "type": "string",
            "description": "Category of the award (e.g., \"restaurants\", \"hotels\")"
          },
          "geo": {
            "type": "string",
            "description": "Geographic location where the award was received"
          },
          "image": {
            "$ref": "#/components/schemas/ImageUrl"
          },
          "name": {
            "type": "string",
            "description": "Name of the award"
          },
          "type": {
            "$ref": "#/components/schemas/Type"
          },
          "year": {
            "type": "integer",
            "format": "int32",
            "description": "Year the award was received"
          }
        }
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
      "Geo": {
        "type": "object",
        "properties": {
          "abbreviation": {
            "type": "string",
            "description": "Short abbreviation for the geo (when applicable)"
          },
          "awards": {
            "type": "array",
            "description": "Awards received by this geo",
            "items": {
              "$ref": "#/components/schemas/AwardV1"
            },
            "uniqueItems": true
          },
          "collections": {
            "type": "array",
            "deprecated": true,
            "description": "Deprecated. The concept of Collections is deprecated and will be removed in future versions.\n Curated collections relevant to this geo.",
            "items": {
              "$ref": "#/components/schemas/GeoCollection"
            },
            "uniqueItems": true
          },
          "coordinates": {
            "$ref": "#/components/schemas/Coordinates"
          },
          "descriptions": {
            "type": "array",
            "description": "Localized descriptive text about the geo",
            "items": {
              "$ref": "#/components/schemas/Translation"
            },
            "uniqueItems": true
          },
          "forum_faqs": {
            "type": "array",
            "description": "Frequently asked questions from community/forum for this geo",
            "items": {
              "$ref": "#/components/schemas/GeoForumFaq"
            },
            "uniqueItems": true
          },
          "hierarchy": {
            "$ref": "#/components/schemas/GeoHierarchy"
          },
          "id": {
            "type": "integer",
            "format": "int32",
            "description": "Tripadvisor Geo identifier"
          },
          "names": {
            "type": "array",
            "description": "Localized names for this geo",
            "items": {
              "$ref": "#/components/schemas/TranslationWithPrimary"
            },
            "uniqueItems": true
          },
          "suggested_itineraries": {
            "type": "array",
            "description": "Suggested itineraries curated for this geo",
            "items": {
              "$ref": "#/components/schemas/GeoSuggestedItinerary"
            },
            "uniqueItems": true
          },
          "type": {
            "$ref": "#/components/schemas/GeoType"
          },
          "urls": {
            "$ref": "#/components/schemas/GeoUrls"
          }
        },
        "required": [
          "descriptions",
          "id",
          "names",
          "type"
        ]
      },
      "GeoCollection": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Identifier for the collection"
          },
          "title": {
            "type": "string",
            "description": "Display title of the collection"
          },
          "url": {
            "type": "string",
            "description": "URL to the collection landing page"
          }
        }
      },
      "GeoForumFaq": {
        "type": "object",
        "properties": {
          "answers": {
            "type": "array",
            "description": "List of answers to the question",
            "items": {
              "$ref": "#/components/schemas/GeoForumFaqAnswer"
            }
          },
          "language": {
            "type": "string",
            "description": "Language code of the question and answers (e.g., \"en\")"
          },
          "question": {
            "type": "string",
            "description": "Frequently asked question text"
          }
        }
      },
      "GeoForumFaqAnswer": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "description": "Body text of the answer"
          },
          "title": {
            "type": "string",
            "description": "Optional title/heading for the answer"
          }
        }
      },
      "GeoHierarchy": {
        "type": "object",
        "properties": {
          "ancestors": {
            "type": "array",
            "description": "Ordered set of ancestor geos (closest ancestor last rank)",
            "items": {
              "$ref": "#/components/schemas/Ancestor"
            },
            "uniqueItems": true
          }
        }
      },
      "GeoItineraryDay": {
        "type": "object",
        "properties": {
          "day": {
            "type": "integer",
            "format": "int32",
            "description": "Day index within the itinerary (1-based)"
          },
          "description": {
            "type": "string",
            "description": "Description of the day's activities"
          },
          "location_ids": {
            "type": "array",
            "description": "Location IDs suggested within an itinerary day",
            "items": {
              "$ref": "#/components/schemas/GeoItineraryDayLocationId"
            },
            "uniqueItems": true
          }
        }
      },
      "GeoItineraryDayLocationId": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int32",
            "description": "Location id referenced in the itinerary day"
          },
          "rank": {
            "type": "integer",
            "format": "int32",
            "description": "Rank/order of the location within the day"
          }
        }
      },
      "GeoSuggestedItinerary": {
        "type": "object",
        "properties": {
          "itinerary": {
            "type": "array",
            "description": "Ordered list of itinerary days",
            "items": {
              "$ref": "#/components/schemas/GeoItineraryDay"
            }
          },
          "trip_creation_method": {
            "type": "string",
            "description": "How the trip was created (e.g., curated, auto-generated)\n <p>\n One of:\n <ul>\n     <li>MANUAL</li>\n     <li>GENERATIVE_AI</li>\n </ul>"
          },
          "trip_id": {
            "type": "integer",
            "format": "int32",
            "description": "Unique trip identifier"
          },
          "trip_interest_tags": {
            "type": "array",
            "description": "Set of interest tags associated with the trip",
            "items": {
              "type": "string"
            },
            "uniqueItems": true
          },
          "trip_title": {
            "type": "string",
            "description": "Title of the suggested trip"
          },
          "trip_url": {
            "type": "string",
            "description": "URL to the suggested trip page"
          }
        }
      },
      "GeoType": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int32",
            "description": "Geo type identifier (stable id)"
          },
          "name": {
            "type": "string",
            "description": "Human-readable geo type name (e.g., City, Region, Country)"
          }
        },
        "required": [
          "id",
          "name"
        ]
      },
      "GeoUrls": {
        "type": "object",
        "properties": {
          "flights": {
            "type": "string",
            "description": "URL for Flights in a given geo"
          },
          "geo_page": {
            "type": "string",
            "description": "Main Tripadvisor geo page URL"
          },
          "hotels": {
            "type": "string",
            "description": "URL for hotels in a given geo"
          },
          "restaurants": {
            "type": "string",
            "description": "URL for restaurants in a given geo"
          },
          "things_to_do": {
            "type": "string",
            "description": "URL for Things to Do in a given geo"
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
      "Type": {
        "type": "string",
        "enum": [
          "Certificate of Excellence",
          "Travelers' Choice"
        ]
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
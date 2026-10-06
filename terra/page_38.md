---
updatedAt: 2026-09-28T14:28:19.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Multiple Locations Details

Retrieves the full details of multiple Tripadvisor Locations in a single request.

 <p>This is the batch (multi-GET) counterpart to the single Location Details endpoint; supply a set of
 Location IDs and receive the corresponding Locations. IDs that you are not licensed to access, or that
 do not exist, are omitted from the response rather than causing the whole request to fail.

## Multiple Locations Details requests

A Multiple Locations Details request takes a set of Tripadvisor Location IDs and returns the full details of each, in a single call. It is the batch counterpart to [Location Details](/reference/locationget).

Pass the IDs as a comma-separated list in the `id` parameter. The parameter is `id`, singular; there is no `ids` parameter.

A request is an HTTP GET to a URL in the form:

```
https://terra.tripadvisor.com/api/locations
```

## Multiple Locations Details responses

The response is an object containing a `data` array of Location objects. The envelope is present even when a single ID is requested, which differs from Location Details, where the Location is returned directly.

Each Location carries the same fields as Location Details. Fields with no data are omitted rather than returned as `null` or `{}`.

IDs that do not exist, or that you are not licensed to access, are omitted from `data` rather than causing the request to fail. The array can therefore be shorter than the list of IDs requested. Compare `data[].id` against the requested IDs to detect omissions.

## Billing

This endpoint is billed per Location returned. A request for three IDs that all resolve is billed as three entities; omitted IDs are not billed. Most other endpoints are billed once per call. See [Usage-based Pricing](/docs/usage-based-pricing).

## Examples

### Retrieve three Locations

```bash
curl "https://terra.tripadvisor.com/api/locations?version=1&id=187147,188151,190420" \
  -H "X-API-Key: API_KEY"
```

The response is in the form:

```json
{
  "data": [
    { "id": 187147, "names": [], "addresses": [] },
    { "id": 188151, "names": [], "addresses": [] }
  ]
}
```

Only two of the three requested IDs resolved. The third was either not found or not licensed.

### Retrieve Locations in two locales

`locale` is repeatable. Translated fields return one entry per resolved locale; enum labels such as category and award names resolve using the first locale only.

```bash
curl "https://terra.tripadvisor.com/api/locations?version=1&id=187147,188151&locale=es-MX&locale=fr-FR" \
  -H "X-API-Key: API_KEY"
```

## Related

* [Location Details](/reference/locationget) — a single Location, and the full field reference
* [Multiple Geos Details](/reference/geosget) — the same pattern for destinations
* [Supported Locales](/docs/locales) — locale codes and the fallback chain

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
    "/locations": {
      "get": {
        "description": "Retrieves the full details of multiple Tripadvisor Locations in a single request.\n\n <p>This is the batch (multi-GET) counterpart to the single Location Details endpoint; supply a set of\n Location IDs and receive the corresponding Locations. IDs that you are not licensed to access, or that\n do not exist, are omitted from the response rather than causing the whole request to fail.",
        "operationId": "locationsGet",
        "parameters": [
          {
            "description": "the set of Tripadvisor Location IDs to retrieve",
            "in": "query",
            "name": "id",
            "required": true,
            "schema": {
              "type": "array",
              "items": {
                "type": "integer",
                "format": "int32"
              },
              "uniqueItems": true
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
                  "$ref": "#/components/schemas/DataResponseLocation"
                }
              }
            },
            "description": "the details for each requested Location that could be resolved"
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
        "summary": "Multiple Locations Details",
        "tags": [
          "Location"
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "Accommodation": {
        "type": "object",
        "properties": {
          "brand": {
            "type": "string",
            "description": "Hotel brand name (e.g. <code>&quot;Marriott&quot;</code>, <code>&quot;Hilton&quot;</code>)."
          },
          "chain": {
            "type": "string",
            "description": "Hotel chain affiliation (e.g. <code>&quot;Marriott International&quot;</code>)."
          },
          "prices": {
            "type": "array",
            "description": "Rate ranges for the accommodation, one entry per currency.",
            "items": {
              "$ref": "#/components/schemas/Price"
            }
          },
          "room_count": {
            "type": "integer",
            "format": "int32",
            "description": "Total number of rooms at the accommodation."
          },
          "star_rating": {
            "type": "integer",
            "format": "int32",
            "description": "Official star rating of the accommodation (1–5)."
          }
        }
      },
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
      "Attribute": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique identifier for the attribute"
          },
          "name": {
            "type": "string",
            "description": "Human-readable name of the attribute"
          },
          "type": {
            "type": "string",
            "description": "Type of attribute (e.g., \"amenity\", \"feature\", \"service\")"
          },
          "type_id": {
            "type": "string",
            "description": "Type identifier for the attribute"
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
      "Breakdown": {
        "type": "object",
        "properties": {
          "count": {
            "type": "integer",
            "format": "int32"
          },
          "rating": {
            "type": "integer",
            "format": "int32"
          },
          "rating_name": {
            "type": "string"
          }
        }
      },
      "Category": {
        "type": "object",
        "properties": {
          "display_name": {
            "type": "string",
            "description": "Human-readable display name for the category"
          },
          "hierarchy": {
            "type": "string",
            "description": "Hierarchical path of the category (e.g., \"restaurants > fine_dining\")"
          },
          "id": {
            "type": "string",
            "description": "Unique identifier for the category"
          },
          "parent_category": {
            "$ref": "#/components/schemas/ParentCategory"
          },
          "top_level_category": {
            "$ref": "#/components/schemas/TopLevelCategory"
          }
        },
        "required": [
          "id"
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
      "DataResponseLocation": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Location"
            }
          }
        }
      },
      "DayOfWeek": {
        "type": "string",
        "enum": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
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
      "LanguageCount": {
        "type": "object",
        "properties": {
          "count": {
            "type": "integer",
            "format": "int32"
          },
          "language": {
            "type": "string"
          }
        }
      },
      "ListingStatus": {
        "type": "string",
        "enum": [
          "OPEN",
          "CLOSED",
          "TEMPORARILY_CLOSED"
        ]
      },
      "Location": {
        "type": "object",
        "description": "A Tripadvisor Location: a point of interest such as a hotel or other accommodation, a restaurant, or an\n attraction.\n\n <p>This is the full representation returned by the Location endpoints, combining factual data (names,\n address, coordinates, contact details, categories, opening hours) with rich content (descriptions,\n traveler ratings, rankings, awards, and aggregate photo information). Optional fields are omitted from the\n response when no data is available for the Location.",
        "properties": {
          "accommodation": {
            "$ref": "#/components/schemas/Accommodation"
          },
          "addresses": {
            "type": "array",
            "description": "Postal addresses for the Location, including a pre-formatted single-line representation per language.",
            "items": {
              "$ref": "#/components/schemas/Address"
            }
          },
          "attributes": {
            "type": "array",
            "description": "Descriptive attributes of the Location, such as amenities and features (e.g. Free Wi-Fi, Outdoor Pool).",
            "items": {
              "$ref": "#/components/schemas/Attribute"
            }
          },
          "awards": {
            "type": "array",
            "description": "Tripadvisor awards the Location has received (e.g. Travelers' Choice).",
            "items": {
              "$ref": "#/components/schemas/AwardV1"
            }
          },
          "categories": {
            "type": "array",
            "description": "The categories this Location is classified under, including the top-level category and parent\n hierarchy (e.g. Lodging &gt; Hotels).",
            "items": {
              "$ref": "#/components/schemas/Category"
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
          "neighborhoods": {
            "type": "array",
            "description": "Neighborhoods (sub-geographic areas) that the Location is part of.",
            "items": {
              "$ref": "#/components/schemas/Neighborhood"
            }
          },
          "official_email": {
            "type": "string",
            "description": "The Location's official contact email address, when available."
          },
          "opening_hours": {
            "$ref": "#/components/schemas/OpeningHours"
          },
          "phone_numbers": {
            "type": "array",
            "description": "Contact phone numbers for the Location, each tagged with its type (e.g. phone, fax).",
            "items": {
              "$ref": "#/components/schemas/PhoneNumber"
            }
          },
          "photos": {
            "$ref": "#/components/schemas/LocationPhotoInfo"
          },
          "price_level": {
            "type": "string",
            "description": "Indicative price level for the Location, applicable to restaurants. One of:\n <ul>\n     <li>Cheap Eats</li>\n     <li>Fine Dining</li>\n     <li>Mid Range</li>\n </ul>"
          },
          "rankings": {
            "type": "array",
            "description": "The Location's rank within its Geo and category (e.g. \"#23 of 500 Hotels in Lisbon\").",
            "items": {
              "$ref": "#/components/schemas/RankingV1"
            }
          },
          "recommended_visit_length": {
            "type": "integer",
            "format": "int32",
            "description": "Coded indicator of the suggested length of a visit to the Location:\n <ul>\n     <li>0 — unknown / not set</li>\n     <li>1 — under 1 hour</li>\n     <li>2 — 1–2 hours</li>\n     <li>3 — 2–3 hours</li>\n     <li>4 — over 3 hours</li>\n </ul>"
          },
          "status": {
            "$ref": "#/components/schemas/Status"
          },
          "traveler_ratings": {
            "$ref": "#/components/schemas/TravelerRatings"
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
          "names",
          "photos",
          "status"
        ]
      },
      "LocationPhotoInfo": {
        "type": "object",
        "properties": {
          "total_count": {
            "type": "integer",
            "format": "int32"
          }
        }
      },
      "Neighborhood": {
        "type": "object",
        "properties": {
          "geo_id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        }
      },
      "OpeningHours": {
        "type": "object",
        "properties": {
          "formatted": {
            "type": "array",
            "description": "Human-readable formatted opening hours strings",
            "items": {
              "type": "string"
            }
          },
          "periods": {
            "type": "array",
            "description": "List of opening hours periods for different days of the week",
            "items": {
              "$ref": "#/components/schemas/Period"
            }
          },
          "timezone": {
            "type": "string",
            "description": "Timezone identifier for the opening hours (e.g., \"America/New_York\")"
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
      "ParentCategory": {
        "type": "object",
        "properties": {
          "display_name": {
            "type": "string",
            "description": "Display name for the parent category"
          },
          "id": {
            "type": "string",
            "description": "Unique identifier for the parent category"
          },
          "parent_category": {
            "type": "object"
          }
        }
      },
      "Period": {
        "type": "object",
        "properties": {
          "closes": {
            "type": "string",
            "description": "Closing time in HH:MM format (24-hour)",
            "example": "20:00:00"
          },
          "day_of_week": {
            "$ref": "#/components/schemas/DayOfWeek"
          },
          "opens": {
            "type": "string",
            "description": "Opening time in HH:MM format (24-hour)",
            "example": "08:00:00"
          }
        }
      },
      "PhoneNumber": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "description": "Type of phone number (e.g., \"main\", \"fax\", \"mobile\", \"toll-free\")\n <p>\n One of:\n <ul>\n     <li>phone</li>\n </ul>"
          },
          "value": {
            "type": "string",
            "description": "The phone number value in international format (e.g., \"+1-555-123-4567\")"
          }
        },
        "required": [
          "type",
          "value"
        ]
      },
      "Price": {
        "type": "object",
        "properties": {
          "currency": {
            "type": "string",
            "description": "ISO 4217 currency code for the rates (e.g. <code>&quot;USD&quot;</code>, <code>&quot;EUR&quot;</code>)."
          },
          "max_rate": {
            "type": "number",
            "description": "Maximum room rate in the specified currency."
          },
          "min_rate": {
            "type": "number",
            "description": "Minimum room rate in the specified currency."
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
      "RankingV1": {
        "type": "object",
        "properties": {
          "category": {
            "type": "string",
            "description": "Category name for the ranking"
          },
          "category_id": {
            "type": "string",
            "description": "Category ID for the ranking"
          },
          "display_text": {
            "type": "string",
            "description": "Human-readable display text for the ranking"
          },
          "geo": {
            "type": "string",
            "description": "Geographic location name where the ranking applies"
          },
          "geo_id": {
            "type": "integer",
            "format": "int32",
            "description": "Geographic ID where the ranking applies"
          },
          "rank": {
            "type": "integer",
            "format": "int32",
            "description": "Current rank position (1-based)"
          },
          "total": {
            "type": "integer",
            "format": "int32",
            "description": "Total number of items in the ranking category"
          }
        }
      },
      "Status": {
        "type": "object",
        "properties": {
          "closed_date": {
            "type": "string",
            "description": "Date when the location was closed"
          },
          "reopen_date": {
            "type": "string",
            "description": "Date when the location is scheduled to reopen"
          },
          "value": {
            "$ref": "#/components/schemas/ListingStatus"
          }
        },
        "required": [
          "value"
        ]
      },
      "SubRating": {
        "type": "object",
        "properties": {
          "count": {
            "type": "integer",
            "format": "int32"
          },
          "icon_url": {
            "type": "string"
          },
          "rating": {
            "type": "number"
          },
          "type": {
            "type": "string"
          },
          "type_name": {
            "type": "string"
          }
        }
      },
      "TopLevelCategory": {
        "type": "string",
        "enum": [
          "Accommodation",
          "Experience",
          "Attraction",
          "Eat & Drink"
        ],
        "title": "Top Level Categories"
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
      "TravelerRatings": {
        "type": "object",
        "description": "Aggregated traveler rating information for a Location, summarizing all of its reviews.",
        "properties": {
          "breakdowns": {
            "type": "array",
            "description": "Distribution of reviews across each rating value (e.g. how many reviews rated the Location 5, 4, 3).",
            "items": {
              "$ref": "#/components/schemas/Breakdown"
            }
          },
          "language_counts": {
            "type": "array",
            "description": "Number of reviews available for the Location per language.",
            "items": {
              "$ref": "#/components/schemas/LanguageCount"
            }
          },
          "overall": {
            "$ref": "#/components/schemas/Overall"
          },
          "subratings": {
            "type": "array",
            "description": "Average ratings broken down by aspect (e.g. service, cleanliness, value).",
            "items": {
              "$ref": "#/components/schemas/SubRating"
            }
          }
        }
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
      "Type": {
        "type": "string",
        "enum": [
          "Certificate of Excellence",
          "Travelers' Choice"
        ]
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
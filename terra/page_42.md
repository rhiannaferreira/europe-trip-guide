---
updatedAt: 2026-09-28T14:28:19.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Recommendations

Returns AI-powered Location recommendations for a natural-language query.

 <p>Accepts a free-text query plus optional geographic context, category filters, and a result limit,
 and returns a ranked set of recommended Locations (and Experiences), each with supporting review
 citations. Built on Tripadvisor's user-generated content and metadata for use in agentic workflows.

## Recommendations requests

A Recommendations request takes a natural-language query and a geographic scope, and returns a ranked set of recommended Locations and Experiences. Each result may include the review snippets that support it. Recommendations only supports POST requests.

A request is an HTTP POST to a URL in the form:

```
https://terra.tripadvisor.com/api/recommendations/search
```

Pass all fields in the JSON request body. For example:

```bash
curl -X POST "https://terra.tripadvisor.com/api/recommendations/search?version=1" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: API_KEY" \
  -d '{
    "query": "quiet wine bar with outdoor seating for an anniversary",
    "geo": { "id": 187147 },
    "top_level_categories": ["Eat & Drink"],
    "limit": 5,
    "response_preference": "quality"
  }'
```

The request body is strict. A field the schema does not define returns `400` rather than being ignored.

### query

Required, and must not be empty. The natural-language request. Express constraints in the query text — for example "kid-friendly", "under €30", "walkable from the station". There are no separate parameters for them.

### geo

Required. The geographic scope, given in one of three forms:

* `search_area` — an explicit centroid and radius.
* `id` — a Tripadvisor Geo ID, resolved with [Geo Details](/reference/geoget).
* `name` — a destination name, such as `"Paris"`, `"Boston MA"` or `"Brooklyn, New York, USA"`.

Each field is individually optional, and when more than one is supplied they are applied in that order of precedence: `search_area` overrides both `id` and `name`, and `id` overrides `name`.

The `geo` object itself is required, but it may be empty. An empty `geo` causes Tripadvisor to infer the destination from the query text. Supplying any form of `geo` overrides whatever the query text implies.

### top\_level\_categories

Filters results by category. One or more of `Accommodation`, `Eat & Drink`, `Attraction`, `Experience`. If omitted, all categories are eligible.

### limit

The maximum number of Locations to return. Defaults to 5.

### exclude\_location\_ids

Location IDs to omit from the results. Pass the IDs returned by a previous request to retrieve further results for the same query.

### response\_preference

The trade-off between response speed and recommendation quality. One of `quality` (default) or `speed`.

## Recommendations responses

The response contains a `search_results` array. Each entry has a `type` of either `location` or `experience`, and populates the corresponding object. An `experience` result carries its own providers and tags, so both shapes must be handled.

Each entry may carry a `review_sources` array of supporting review snippets. The array can be empty; a recommendation is not guaranteed to have citations.

## Billing

Each call is billed as one entity, regardless of `limit`. See [Usage-based Pricing](/docs/usage-based-pricing).

Note: review snippets must be shown with attribution and linked back to Tripadvisor, as with any review content. See [Linking Policy](/docs/linking-policy).

## Examples

### Recommend restaurants in a named city

```bash
curl -X POST "https://terra.tripadvisor.com/api/recommendations/search?version=1" \
  -H "Content-Type: application/json" -H "X-API-Key: API_KEY" \
  -d '{ "query": "family-friendly lunch near the museum district",
        "geo": { "name": "Amsterdam" },
        "top_level_categories": ["Eat & Drink"] }'
```

### Retrieve the next set of results

```bash
curl -X POST "https://terra.tripadvisor.com/api/recommendations/search?version=1" \
  -H "Content-Type: application/json" -H "X-API-Key: API_KEY" \
  -d '{ "query": "family-friendly lunch near the museum district",
        "geo": { "name": "Amsterdam" },
        "exclude_location_ids": [190420, 190421, 190422] }'
```

### Favour latency over ranking quality

```bash
curl -X POST "https://terra.tripadvisor.com/api/recommendations/search?version=1" \
  -H "Content-Type: application/json" -H "X-API-Key: API_KEY" \
  -d '{ "query": "rooftop bar with a view",
        "geo": { "id": 187147 },
        "response_preference": "speed" }'
```

## Related

* [Geo Details](/reference/geoget) — resolve a destination to a `geo_id`
* [Location Details](/reference/locationget) — the full record for a recommended Location
* [Linking Policy](/docs/linking-policy) — attribution requirements for review snippets
* [API Access and Limits](/docs/api-access-and-limits) — this endpoint has a separate allowance

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
    "/recommendations/search": {
      "post": {
        "description": "Returns AI-powered Location recommendations for a natural-language query.\n\n <p>Accepts a free-text query plus optional geographic context, category filters, and a result limit,\n and returns a ranked set of recommended Locations (and Experiences), each with supporting review\n citations. Built on Tripadvisor's user-generated content and metadata for use in agentic workflows.",
        "operationId": "recommendationsSearch",
        "parameters": [
          {
            "description": "preferred locales for localized fields in the recommended results, in priority order;\n               falls back to the default locale when omitted",
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
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RecommendationSearchRequest"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RecommendationsSearchResponse"
                }
              }
            },
            "description": "the ranked recommendation results for the query"
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
        "summary": "Recommendations",
        "tags": [
          "Agentic Search"
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
      "Geography": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int32",
            "description": "Tripadvisor unique geographical identifier (Geo ID) for the destination.\n Takes precedence over destination_name if both are provided and search_area is not.",
            "title": "Geo Id"
          },
          "name": {
            "type": "string",
            "description": "Name of the destination.\n Used as geographic context if geo_id or search_area are not provided.",
            "example": "'Paris', 'Boston MA', 'Brooklyn, New York, USA'",
            "title": "Destination Name"
          },
          "search_area": {
            "$ref": "#/components/schemas/SearchArea"
          }
        },
        "title": "Geography"
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
      "OverallTravellerRatings": {
        "type": "object",
        "properties": {
          "bubble_rating": {
            "type": "number",
            "description": "Overall bubble rating score (typically 1.0 to 5.0)"
          },
          "total_review_count": {
            "type": "integer",
            "format": "int32",
            "description": "Total number of reviews contributing to this rating"
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
      "ProviderCode": {
        "type": "object",
        "properties": {
          "product_code": {
            "type": "string",
            "description": "Product code identifier for the experience provider"
          }
        },
        "required": [
          "product_code"
        ]
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
      "RecommendationExperience": {
        "type": "object",
        "description": "A recommended Experience (a bookable tour, activity, or attraction ticket), carrying the subset of\n Experience detail relevant to a recommendation result.",
        "properties": {
          "coordinates": {
            "$ref": "#/components/schemas/Coordinates"
          },
          "description": {
            "type": "array",
            "description": "Editorial descriptions of the Experience, provided in one or more languages.",
            "items": {
              "$ref": "#/components/schemas/Translation"
            },
            "uniqueItems": true
          },
          "id": {
            "type": "integer",
            "format": "int32",
            "description": "Tripadvisor's unique identifier for this Experience."
          },
          "names": {
            "type": "array",
            "description": "The Experience's name in one or more languages.",
            "items": {
              "$ref": "#/components/schemas/Translation"
            },
            "uniqueItems": true
          },
          "overall_traveller_ratings": {
            "$ref": "#/components/schemas/OverallTravellerRatings"
          },
          "providers": {
            "type": "object",
            "additionalProperties": {
              "$ref": "#/components/schemas/ProviderCode"
            },
            "description": "Booking providers for the Experience, keyed by provider identifier."
          },
          "tags": {
            "type": "array",
            "description": "Descriptive tags associated with the Experience.",
            "items": {
              "type": "string"
            },
            "uniqueItems": true
          }
        },
        "required": [
          "id"
        ]
      },
      "RecommendationLocation": {
        "type": "object",
        "description": "A recommended Location, carrying the subset of Location detail relevant to a recommendation result.",
        "properties": {
          "accommodation": {
            "$ref": "#/components/schemas/Accommodation"
          },
          "addresses": {
            "type": "array",
            "description": "Postal addresses for the Location, including a pre-formatted single-line representation per\n language.",
            "items": {
              "$ref": "#/components/schemas/Address"
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
            "description": "The categories this Location is classified under, including the top-level category and parent\n hierarchy.",
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
          "rankings": {
            "type": "array",
            "description": "The Location's rank within its Geo and category (e.g. \"#23 of 500 Hotels in Lisbon\").",
            "items": {
              "$ref": "#/components/schemas/RankingV1"
            }
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
          "addresses",
          "coordinates",
          "id",
          "names",
          "opening_hours",
          "phone_numbers",
          "status",
          "traveler_ratings",
          "urls"
        ]
      },
      "RecommendationSearchRequest": {
        "type": "object",
        "properties": {
          "exclude_location_ids": {
            "type": "array",
            "description": "List of location ids to filter from the response set. Can be used to simulate pagination.",
            "items": {
              "type": "integer",
              "format": "int32",
              "title": "Exclude Location Ids"
            },
            "title": "Exclude Location Ids"
          },
          "geo": {
            "$ref": "#/components/schemas/Geography"
          },
          "limit": {
            "type": "integer",
            "format": "int32",
            "default": 5,
            "description": "Maximum number of locations to return.",
            "title": "Limit"
          },
          "query": {
            "type": "string",
            "description": "Free-text search query from the user. If no destination name, geo_id, or search area is provided,\n Tripadvisor will attempt to infer the destination context from the free-text query.",
            "title": "Query"
          },
          "response_preference": {
            "$ref": "#/components/schemas/RecommendationSearchRequestResponsePreference"
          },
          "top_level_categories": {
            "type": "array",
            "description": "A set of top level categories (aka PlaceTypes) to filter or focus the search\n (e.g., ['Eat & Drink', 'Accommodation'], ['Attraction']).",
            "items": {
              "$ref": "#/components/schemas/TopLevelCategory"
            },
            "title": "Top Level Categories",
            "uniqueItems": true
          }
        },
        "required": [
          "geo",
          "query"
        ]
      },
      "RecommendationSearchRequestResponsePreference": {
        "type": "string",
        "default": "quality",
        "enum": [
          "quality",
          "speed"
        ]
      },
      "RecommendationSearchResult": {
        "type": "object",
        "description": "A single recommended result from Agentic Search.\n\n <p>Each result represents either a Location or an Experience (indicated by <code>type</code>), with the\n corresponding field populated. Results also carry the review citations that support why the item was\n recommended for the query.",
        "properties": {
          "experience": {
            "$ref": "#/components/schemas/RecommendationExperience"
          },
          "location": {
            "$ref": "#/components/schemas/RecommendationLocation"
          },
          "review_sources": {
            "type": "array",
            "description": "Citations to the Tripadvisor reviews that justify this recommendation in the context of the query.\n Returns an empty array when no specific sources are attributed to this result for the query.",
            "items": {
              "$ref": "#/components/schemas/ReviewSource"
            }
          },
          "type": {
            "$ref": "#/components/schemas/RecommendationSearchResultType"
          }
        },
        "required": [
          "review_sources",
          "type"
        ]
      },
      "RecommendationSearchResultType": {
        "type": "string",
        "enum": [
          "location",
          "experience"
        ]
      },
      "RecommendationsSearchResponse": {
        "type": "object",
        "description": "The response to an Agentic Search recommendations request: the ranked set of recommended results for the\n query.",
        "properties": {
          "search_results": {
            "type": "array",
            "description": "The recommended results, ordered from most to least relevant for the query. Each result is either a\n Location or an Experience.",
            "items": {
              "$ref": "#/components/schemas/RecommendationSearchResult"
            }
          }
        },
        "required": [
          "search_results"
        ]
      },
      "ReviewSource": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int32",
            "description": "Unique identifier for the Tripadvisor review.",
            "title": "ID"
          },
          "snippet": {
            "type": "string",
            "description": "A relevant text snippet from the review that supports or is related to the recommendation and query.",
            "title": "Snippet"
          }
        },
        "required": [
          "id",
          "snippet"
        ]
      },
      "SearchArea": {
        "type": "object",
        "properties": {
          "centroid_latitude": {
            "type": "number",
            "description": "Latitude of the search area center.",
            "title": "Centroid Latitude"
          },
          "centroid_longitude": {
            "type": "number",
            "description": "Longitude of the search area center.",
            "title": "Centroid Longitude"
          },
          "search_radius_meters": {
            "type": "number",
            "description": "Radius of the search area in meters.",
            "title": "Search Radius Meters"
          }
        },
        "required": [
          "centroid_latitude",
          "centroid_longitude",
          "search_radius_meters"
        ],
        "title": "Search Area"
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
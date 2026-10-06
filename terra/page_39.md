---
updatedAt: 2026-09-28T14:28:19.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Search Nearby Locations

Finds Locations within a geographic area, ordered by proximity or rating.

 <p>The search area is defined either by a center point and radius or by a bounding box, supplied via
 the <code>search</code> parameters. Results are restricted to Locations you are licensed to access and
 return the full Location representation, optionally with a single representative photo.

## Search Nearby Locations requests

A Search Nearby Locations request takes a geographic area and returns the Locations within it, ordered by distance or rating. Results are limited to Locations on your allowlist.

Define the search area in one of three ways. The strategies are mutually exclusive.

| Strategy                 | Parameters                             |
| ------------------------ | -------------------------------------- |
| Radius around a point    | `lat`, `lon`, `radius`, `unit`         |
| Radius around a Location | `location_id`, `radius`, `unit`        |
| Bounding box             | `sw_lat`, `sw_lon`, `ne_lat`, `ne_lon` |

## Search Nearby Locations responses

The response is a paged object. The `data` array contains the matching Locations. Each entry carries the full Location representation plus `distance_kilometers`, `distance_miles` and `bearing`, measured from the center point. The `pagination` object carries `page`, `size`, `total_elements` and `total_pages`. Pages are 1-based.

Both distance fields are returned regardless of the `unit` parameter. `unit` controls only how the `radius` value is interpreted.

`bearing` is the initial forward azimuth in degrees from the center point to the Location.

## Search parameters

### radius and unit

`unit` is `MI` (default) or `KM`. `radius` must be greater than 0, and has a maximum that depends on the unit:

| Unit | Maximum radius |
| ---- | -------------- |
| `KM` | 8              |
| `MI` | 5              |

A larger value returns `400` with the message `` `radius` cannot be greater than 8.0 KM ``.

### Bounding box

All four corners are required when `radius` is not given. Omitting any returns `400` with the message `` `sw_lat`, `sw_lon`, `ne_lat`, `ne_lon` are required when `radius` is not specified ``.

`sw_lat` must be less than `ne_lat`, otherwise `400` with the message `` `sw_lat` must be less than `ne_lat` ``.

### min\_rating

Returns only Locations rated at least this value, from 1 to 5.

### sort

`rating,desc` by default. `distance,asc` is available for radius searches only, not for bounding boxes.

### include\_photo

When `true`, adds a single representative photo to each result. For the full set, use [Location Photos](/reference/locationphotosget).

## Limits

`size` must be between 1 and 20 inclusive, and defaults to 20. A larger value returns `400` with the message `'size' should not go over 20`.

The result offset, calculated as `size × (page − 1)`, must not exceed 40. A larger offset returns `400` with the message `The requested offset ('size' times 'page') should not go over 40`. At the default `size` of 20, pages 1 through 3 are available and page 4 is not, so a single center point returns at most 60 Locations. To reach more, narrow the radius and issue separate requests, or apply filters.

Note: mixing parameters from two strategies returns `400` with the message `Ambiguous set of parameters, unable to determine searching strategy.` Send `lat` and `lon`, or `location_id`, or the four bounding-box corners — not a combination.

Note: the search and nearby endpoints have a lower rate limit than the rest of your package. Wait for a map to settle rather than issuing a request per pan. See [API Access and Limits](/docs/api-access-and-limits).

Note: results are restricted to your allowlist. An empty `data` array in a dense area usually indicates the allowlist rather than absent data.

## Examples

### Find restaurants within 2 km of a point

```bash
curl "https://terra.tripadvisor.com/api/locations/nearby?version=1&lat=48.8566&lon=2.3522&radius=2&unit=KM&category=RESTAURANT" \
  -H "X-API-Key: API_KEY"
```

### Find highly rated Locations around a known Location

```bash
curl "https://terra.tripadvisor.com/api/locations/nearby?version=1&location_id=187147&radius=1&unit=KM&min_rating=4" \
  -H "X-API-Key: API_KEY"
```

### Search a bounding box and include a photo

```bash
curl "https://terra.tripadvisor.com/api/locations/nearby?version=1&sw_lat=48.84&sw_lon=2.32&ne_lat=48.87&ne_lon=2.37&include_photo=true" \
  -H "X-API-Key: API_KEY"
```

### Order results by distance

```bash
curl "https://terra.tripadvisor.com/api/locations/nearby?version=1&lat=48.8566&lon=2.3522&radius=2&unit=KM&sort=distance,asc" \
  -H "X-API-Key: API_KEY"
```

## Related

* [Search Nearby Locations Catalog](/reference/cataloglocationsnearbyget) — not restricted by allowlist, and no offset ceiling
* [Search Locations](/reference/locationssearch) — text search
* [Catalog Search vs Location Search](/docs/guide-for-when-to-use-catalog-search-vs-location-search)

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
    "/locations/nearby": {
      "get": {
        "description": "Finds Locations within a geographic area, ordered by proximity or rating.\n\n <p>The search area is defined either by a center point and radius or by a bounding box, supplied via\n the <code>search</code> parameters. Results are restricted to Locations you are licensed to access and\n return the full Location representation, optionally with a single representative photo.",
        "operationId": "locationsNearbyGet",
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
            "description": "when <code>true</code>, include a single representative photo for each Location",
            "in": "query",
            "name": "include_photo",
            "required": false,
            "schema": {
              "type": "boolean",
              "default": false
            }
          },
          {
            "description": "preferred locales for localized fields (e.g. names, descriptions), in priority\n                     order; falls back to the default locale when omitted",
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
                  "$ref": "#/components/schemas/PageNearbyLocation"
                }
              }
            },
            "description": "a page of Locations within the requested area, each annotated with its distance and bearing\n         from the search center"
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
        "summary": "Search Nearby Locations",
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
      "NearbyLocation": {
        "type": "object",
        "description": "A single result from the Search Nearby Locations endpoint: a full Location paired with its position\n relative to the search center and, optionally, a representative photo.",
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
            "$ref": "#/components/schemas/Location"
          },
          "photo": {
            "$ref": "#/components/schemas/Photo"
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
      "PageNearbyLocation": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/NearbyLocation"
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
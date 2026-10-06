---
updatedAt: 2026-04-23T10:46:29.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Location Reviews

Retrieves traveler reviews for a Tripadvisor Location.

 <p>Returns a page of reviews drawn from the most recent reviews for the Location, with optional
 filtering by minimum rating, trip type, publish date, and language. Reviews include the title, body,
 overall and sub-ratings, trip context, reviewer information, and any owner response.

## Overview

This endpoint returns traveler reviews for a specific Tripadvisor location (by Tripadvisor location ID). The response includes review content, traveler ratings, and operational metadata to support display, analysis, moderation, and personalization workflows.

## Use Cases

<Cards columns={2}>
  <Card title="User-Generated Content Displays" icon="desktop">
    Power rich review sections on destination, restaurant, and hotel pages with ratings, titles, text, photos, and reviewer details.
  </Card>

  <Card title="Travel Planning Experiences" icon="map">
    Help your endusers evaluate locations with recent reviews, star ratings, subratings, and traveler-type context.
  </Card>

  <Card title="Market Intelligence" icon="chart-bar">
    Analyze review volume, recency, sentiment indicators, and helpfulness to monitor performance over time.
  </Card>

  <Card title="Personalization & Recommendations" icon="thumbs-up">
    Use review metadata (language, traveler type, stay dates) to tailor content and ranking to user preferences.
  </Card>
</Cards>

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
    "/locations/{id}/reviews": {
      "get": {
        "description": "Retrieves traveler reviews for a Tripadvisor Location.\n\n <p>Returns a page of reviews drawn from the most recent reviews for the Location, with optional\n filtering by minimum rating, trip type, publish date, and language. Reviews include the title, body,\n overall and sub-ratings, trip context, reviewer information, and any owner response.",
        "operationId": "locationReviewsGet",
        "parameters": [
          {
            "description": "the Tripadvisor Location ID to retrieve reviews for",
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int32"
            }
          },
          {
            "description": "when set, only return reviews with an overall rating of at least this\n                               value",
            "in": "query",
            "name": "rating_min",
            "required": false,
            "schema": {
              "type": "number"
            }
          },
          {
            "description": "when set, only return reviews tagged with this trip type (e.g. business,\n                               family, couples)",
            "in": "query",
            "name": "trip_type",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "description": "when set, only return reviews published on or after this date\n                               (format: <code>YYYY-MM-DD</code>)",
            "in": "query",
            "name": "published_after_ts",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "description": "ordering to apply to the reviews (defaults to most recent)",
            "in": "query",
            "name": "sort_by",
            "required": false,
            "schema": {
              "$ref": "#/components/schemas/ReviewSortBy"
            }
          },
          {
            "description": "cursor for keyset pagination; returns reviews published after the review\n                               with this ID",
            "in": "query",
            "name": "published_after_review_id",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "description": "UGC language code (e.g. <code>en</code>, <code>fr</code>) or the special keyword\n                               <code>primary</code> to return reviews in their original written language.\n                               Defaults to <code>en</code> when absent.",
            "in": "query",
            "name": "language",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "description": "Page index (1-based).",
            "in": "query",
            "name": "page",
            "schema": {
              "type": "integer"
            }
          },
          {
            "description": "Page size.",
            "in": "query",
            "name": "size",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PageReview"
                }
              }
            },
            "description": "a page of reviews for the Location"
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
        "summary": "Location Reviews",
        "tags": [
          "Location"
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
      "OwnerResponse": {
        "type": "object",
        "properties": {
          "author_connection": {
            "type": "string",
            "description": "Type of connection between the author and the business (e.g., \"owner\", \"manager\")"
          },
          "avatar_url": {
            "$ref": "#/components/schemas/ImageUrl"
          },
          "geo_id": {
            "type": "integer",
            "format": "int32",
            "description": "Geographic ID associated with the response owner"
          },
          "id": {
            "type": "integer",
            "format": "int32",
            "description": "Unique identifier for the response owner"
          },
          "publish_date": {
            "type": "string",
            "format": "date-time",
            "description": "Date and time when the response was published"
          },
          "text": {
            "type": "array",
            "description": "Localized text content of the owner's response",
            "items": {
              "$ref": "#/components/schemas/TranslationWithPrimary"
            }
          },
          "username": {
            "type": "string",
            "description": "Username of the response owner"
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
      "PageReview": {
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Review"
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
      "Review": {
        "type": "object",
        "description": "Represents an individual review for a location on Tripadvisor.\n Contains review content, ratings, user information, and photos.",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64",
            "description": "Unique identifier for this review."
          },
          "owner_response": {
            "$ref": "#/components/schemas/OwnerResponse"
          },
          "photos": {
            "type": "array",
            "description": "Photos uploaded with this review.",
            "items": {
              "$ref": "#/components/schemas/PhotoInfo"
            }
          },
          "publish_ts": {
            "type": "string",
            "format": "date-time",
            "description": "Date and time when the review was published."
          },
          "rating": {
            "type": "integer",
            "format": "int32",
            "description": "Overall rating from 1 to 5."
          },
          "rating_icon_url": {
            "$ref": "#/components/schemas/ImageUrl"
          },
          "subratings": {
            "type": "array",
            "description": "Detailed ratings for different aspects like service, value, atmosphere.",
            "items": {
              "$ref": "#/components/schemas/ReviewSubRating"
            }
          },
          "text": {
            "type": "array",
            "description": "Review text content in multiple languages.",
            "items": {
              "$ref": "#/components/schemas/TranslationWithPrimary"
            }
          },
          "title": {
            "type": "array",
            "description": "Review titles in multiple languages.",
            "items": {
              "$ref": "#/components/schemas/TranslationWithPrimary"
            }
          },
          "travel_date": {
            "type": "string",
            "description": "Date when the reviewer visited the location."
          },
          "trip_type": {
            "$ref": "#/components/schemas/TripType"
          },
          "url": {
            "type": "string",
            "description": "URL to view this review on Tripadvisor."
          },
          "user": {
            "$ref": "#/components/schemas/UserInfo"
          }
        },
        "required": [
          "id",
          "publish_ts",
          "rating",
          "subratings",
          "text",
          "title",
          "travel_date",
          "trip_type"
        ]
      },
      "ReviewSortBy": {
        "type": "string",
        "enum": [
          "MOST_RECENT",
          "HIGHEST_RATED"
        ]
      },
      "ReviewSubRating": {
        "type": "object",
        "description": "Rating for a specific aspect like service, value, or atmosphere.",
        "properties": {
          "icon_url": {
            "$ref": "#/components/schemas/ImageUrl"
          },
          "rating": {
            "type": "integer",
            "format": "int32",
            "description": "Rating score from 1 to 5 for this aspect."
          },
          "type": {
            "type": "string",
            "description": "Type of aspect being rated (e.g., \"service\", \"value\", \"atmosphere\")."
          },
          "type_name": {
            "type": "string",
            "description": "Display name for this rating type (e.g., \"Service\", \"Value\")."
          }
        },
        "required": [
          "icon_url",
          "rating",
          "type",
          "type_name"
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
      "TripType": {
        "type": "string",
        "enum": [
          "BUSINESS",
          "COUPLES",
          "FAMILY",
          "FRIENDS",
          "SOLO",
          "NONE"
        ]
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
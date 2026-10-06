---
updatedAt: 2025-10-27T00:43:09.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Errors

The page describes possible known error responses from the API.

## Common Errors

### Bad Request

Error responses of this type indicate that the request to the API was malformed in some way or that bad input data was provided.

```json Example
{
    "type": "https://tripadvisor-content.readme.io/reference/errors#bad-request",
    "title": "Bad Request",
    "status": 400,
    "detail": "Failed to read request",
    "instance": "/test-endpoint/bad-request",
    "trace_id": "68e3aa514e89b2474781dd2884ecb2f4"
}
```

<br />

### Constraint Violation

Error responses of this type typically indicate that the request to the API was malformed (e.g. missing parameters, or invalid parameter type/name/value).
Usually contains extra `field_errors`array field consisting of validation errors per field.

```json Example
{
    "type": "https://tripadvisor-content.readme.io/reference/errors#constraint-violation",
    "title": "Parameter is not valid",
    "status": 400,
    "detail": "name: size must be between 3 and 10",
    "instance": "/test-endpoint/no",
    "field_errors": [
        {
            "field": "name",
            "message": "size must be between 3 and 10",
            "object_name": "name",
            "rejected_value": "no"
        }
    ],
    "trace_id": "68e3a7e320aa837e098a39716e3c1bea",
    "message": "Validation error"
}
```

<br />

### Forbidden Access

Error responses of this type most likely mean the provided API key does not have access to the requested API endpoint.

```json Example
{
    "type": "https://tripadvisor-content.readme.io/reference/errors#forbidden-access",
    "title": "Forbidden",
    "status": 403,
    "detail": "Access Denied",
    "instance": "/test-endpoint/forbidden",
    "trace_id": "68e3aaa6645d68993802b810d55f1eda",
    "message": "API Key does not have access to endpoint"
}
```

<br />

### Resource Not Found

Error responses of this type indicate the requested resource was not found.

```json Example
{
    "type": "https://tripadvisor-content.readme.io/reference/errors#resource-not-found",
    "title": "Not Found",
    "status": 404,
    "detail": "Custom details",
    "instance": "/test-endpoint/404",
    "trace_id": "68e3aac49cfaf11226bfcca58c2b4433"
}
```

<br />

### Too Many Requests

Errors indicating about trespassing Rate Limits, configured for the supplied `API_KEY`.

```json Example
{
    "type": "https://tripadvisor-content.readme.io/reference/errors#too-many-requests",
    "title": "Too Many Requests",
    "status": 429,
    "detail": "Custom details",
    "instance": "/test-endpoint/429",
    "trace_id": "68e3aafe4eeb7d54441934d46863fa0e"
}
```

<br />

### Internal Server Error

Error responses of this type mean that an unpredictable situation happened in the API.

```json Example
{
    "type": "https://tripadvisor-content.readme.io/reference/errors#internal-server-error",
    "title": "Internal Server Error",
    "status": 500,
    "detail": "Something went wrong",
    "instance": "/test-endpoint/500",
    "trace_id": "68e3abeddd1ccfd426919b76d00d9c65"
}
```

<br />

### Unauthorized

Error responses of this type indicate that credentials (API key) were not provided or are invalid.

```json Example
{
    "type": "https://tripadvisor-content.readme.io/reference/errors#unauthorized",
    "title": "Unauthorized",
    "status": 401,
    "detail": "API key is not provided",
    "instance": "/test-endpoint",
    "trace_id": "68e3ac3bf00cf217e8788cf7ea9f7ef0"
}
```

***

## Content-specific

### Geo Not Found

Parent of this error type is [Resource Not Found](#resource-not-found) error type. `Geo` data type specific only. Includes `ids` field.

```json Example
{
    "type": "https://tripadvisor-content.readme.io/reference/errors#/geo-not-found",
    "title": "Geo not found",
    "status": 404,
    "detail": "No geo could be found for the supplied ids",
    "instance": "/geos/123,456,789",
    "trace_id": "68e3af3b7942a306aacfd6ec53370b51",
    "ids": [
        123,
        456,
        789
    ]
}
```

<br />

### Location Not Found

Parent of this error type is [Resource Not Found](#resource-not-found) error type. `Location` data type specific only. Includes `ids` field.

```json Example
{
    "type": "https://tripadvisor-content.readme.io/reference/errors#/location-not-found",
    "title": "Location not found",
    "status": 404,
    "detail": "No location could be found for the supplied ids",
    "instance": "/locations/123,456,789",
    "trace_id": "68e3aeb2ec4a3da7f04132e25b4af2b7",
    "ids": [
        123,
        456,
        789
    ]
}
```

***

#### Additional

<Callout icon="📘" theme="info">
  Each error response consists of (but is not limited to) the following fields:

  * `type`– The type of the problem. (current page is the full list of all types)
  * `title`– The main message (title) of the problem.
  * `status`– The advisory JSON number indicating the HTTP status code.
  * `detail`– Detail message describing the occurred problem.
  * `instance`– The JSON string containing a URI reference that identifies the specific occurrence of the problem.
  * `trace_id`–  Trace (request) ID of the request caused the error.
</Callout>
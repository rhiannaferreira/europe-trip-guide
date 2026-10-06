---
updatedAt: 2026-09-18T19:54:32.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# API Access & Rate Limits

## Rate limiting and quotas

Terra enforces three kinds of limits.

### Your package limits

Every key gets a sustained request rate and a daily quota from its package, unless stated otherwise stated in a separate agreement.

| Package  | Requests per second | Daily quota |
| -------- | ------------------- | ----------- |
| Discover | 10                  | 10,000      |
| Growth   | 25                  | 50,000      |
| Scale    | 50                  | 200,000     |
| Innovate | 100                 | Custom      |

### The daily quota window is rolling

The daily quota runs on a **rolling 24-hour window**. The window opens on your first call and resets 24 hours later. There is no fixed reset time, and no new window opens until you make another call.

Plan for this. If you burn your quota in an hour, you wait until 24 hours after that first call — not until midnight.

### Search and nearby endpoints have their own, much lower limit

These four endpoints share a separate bucket that applies **on every package**, unless stated otherwise in a separate agreement.

* `GET /locations/search`
* `GET /locations/nearby`
* `GET /catalog/locations/search`
* `GET /catalog/locations/nearby`

| Limit          | Value                |
| -------------- | -------------------- |
| Sustained rate | 1 request per second |
| Burst          | 5 requests           |
| Daily          | 86,400               |

### When you hit a limit

Exceeding any limit returns `429 Too Many Requests`. Do not retry immediately or in a tight loop — that extends the window you are waiting on.

## Reducing unnecessary calls

1. **Cache responses.** Follow the Terra [Caching Policy](/docs/caching-policy). Location data and reviews change infrequently, and caching cuts quota consumption substantially.
2. **Use multi-GET.** Fetching several locations in one request to `GET /locations?ids=` removes round trips. Note that this endpoint bills per entity returned rather than per call.
3. **Debounce search.** Given the 1 request per second search limit, a debounce of 300–500ms on user input will do more for your error rate than anything else on this list.

## Endpoint authorization

Your API key does not grant blanket access to every Terra endpoint. Access is controlled by your package — Discover, Growth, Scale, Innovate, Transform — and by any add-ons you have enabled. Each package defines which endpoints are authorized.

Calling an endpoint outside your subscription returns `403 Forbidden`, and the `message` field reads "API Key does not have access to endpoint". To get access, upgrade your package or enable the relevant add-on in your Dashboard.

Catalog and Location reads share a single permission. If your key can call one, it can call the other.
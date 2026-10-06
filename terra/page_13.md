---
updatedAt: 2026-09-18T19:55:35.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# How to use Catalog Search vs Location Search

This guide explains the difference between the Catalog search/nearby endpoints and the Location search/nearby endpoints: what they do, how they differ, and when to use each.

## Use case

### When to use the **Catalog** endpoints

| Use case                               | Why Catalog                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Building or editing your allowlist** | You need to see all matching locations in an area so you can choose which ones to add to your allowlist. Location Search shows only what is already allowed. |
| **Discovery and research**             | You are exploring what exists (for example, "what restaurants are near this point?") without being limited by your current configuration.                    |
| **Internal tools and admin**           | Dashboards or tools that browse the full catalog, manage geo configuration, or support allowlist workflows.                                                  |
| **Testing or debugging**               | You want to confirm that data exists for a query or area. A Location Search can come back empty because of allowlist gating rather than missing data.        |

Catalog endpoints are meant for **reference and configuration**, not for high-volume traffic from your end users.

### When to use the **Location** search/nearby endpoints

| Use case                                 | Why Location search/nearby                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **"Near me" in your app**                | You only want to show places that are on your allowlist.                                             |
| **Search in your product**               | A user types a query and you only want results that are on your allowlist and within your geo setup. |
| **Map or list of supported locations**   | You are displaying only the locations your product supports in that region.                          |
| **Any consumer-facing search or nearby** | You need the full Location payload (photos, review count) and higher throughput.                     |

Location search/nearby is for **live traffic** where every result must respect your allowlist and geofencing.

***

## Response shape

|             | Catalog                                                                                                                                                                        | Location                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Content** | **Abbreviated:** `id`, names, addresses, coordinates, descriptions, `overall_rating`, `urls`. Nearby results also carry `distance_kilometers`, `distance_miles` and `bearing`. | **Full:** the same core fields plus full Location details, review counts, and optional photos (for example with `include_photo`). |
| **Photos**  | No photo objects in the default catalog response.                                                                                                                              | Photos available when requested.                                                                                                  |

Use the Catalog endpoints when you only need enough to identify a place, and the Location endpoints when you need full details and assets for your UI.

Both nearby endpoints return `distance_kilometers` and `distance_miles` on every result regardless of the `unit` parameter. `unit` only controls how your `radius` value is interpreted. `bearing` is the initial forward azimuth in degrees from the center point to the Location.

***

## Two things worth knowing

**Catalog and Location reads share one permission.** If your key can call the Location endpoints, it can call the Catalog endpoints too. There is nothing extra to request.

**Finding a Location in the Catalog does not mean you can fetch it.** A Catalog result is not a licence. Add the ID to your allowlist before calling the Location endpoints for it, or you will get a `404`. See [Guide for Managing Allowed Locations](/docs/guide-for-managing-allowed-locations).

**Search and nearby endpoints share a lower rate limit** than your package's general limit, and the Catalog endpoints count against it. Debounce user input and wait for a map to settle before firing a request. See [API Access and Limits](/docs/api-access-and-limits).
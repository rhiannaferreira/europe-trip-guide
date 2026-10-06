---
updatedAt: 2026-06-18T16:52:17.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Legacy Content API Migration 

For developers migrating from Tripadvisor's Content API.

Tripadvisor's legacy [Content API](https://tripadvisor-content-api.readme.io/reference/overview) is being replaced by Terra, the next-generation content package for self-service customers.

## Getting started

### What is Terra Discover, and why is it replacing the Content API?

Terra is Tripadvisor's rebuilt content delivery platform. It is modular, more performant, and versioned, with a published backward-compatibility policy and public changelog. The Discover package is the direct replacement for the legacy Content API for self-service customers. It preserves the endpoints you already use while adding richer data per response, batch retrieval, new endpoints, and a more stable integration surface.

### How do I get started?

1. Sign up for Terra Discover at [tripadvisor.com/developers](https://www.tripadvisor.com/developers).
2. Generate your new Terra API key from the Terra Dashboard and store it securely.
3. Review the updated API Master Terms, Brand Guidelines & Display Requirements, and Review Implementation Policy.

### When do I need to migrate by?

The legacy Content API will be sunset and API keys deprecated on **August 31, 2026**.  You should complete your migration before that date; do not assume legacy Content API keys remain active indefinitely.

***

## Pricing

### My Content API integration was free — why am I being charged now?

The previous 5,000-call free tier was a legacy Content API offering that has been updated to better align with our infrastructure costs. Terra Discover offers a complimentary tier of up to 1000 calls to support initial testing and evaluation. Once an integration exceeds this volume, standard usage-based pricing applies to sustain the data delivery and infrastructure required for higher-volume workloads.

For detailed pricing information see <https://docs.terra.tripadvisor.com/docs/usage-based-pricing>

### I make a lot of calls. Is there a better option than Discover?

If you regularly exceed 25,000 calls/month, the Growth package's flat per-POI pricing may be more predictable and cost-effective at scale. Reach out to our sales team for a cost comparison. Upgrading from Discover to Growth or Scale uses the same API — no re-integration required.

### Can I cancel?

Yes. Discover is pay-as-you-go with no lock-in — cancel anytime through your dashboard.

***

## What's changing technically

### What's different about the API itself?

Terra keeps the same core REST endpoints you use today (Location Details, Photos, Reviews, Search, Nearby Search) but adds:

* Richer responses — Locations now return coordinates, phone, categories, opening hours, traveler ratings breakdown, rankings, attributes, awards, descriptions, price level, email, neighborhoods, and review summaries. Reviews now carry subratings, trip type, travel date, and user profile info.
* Multi-get (batch) — request multiple POIs in a single call (see below).
* New endpoints — a Geos endpoint for destination-level data, and global catalog endpoints.
* Versioning & stability — explicit version paths (v1), a published backward-compatibility policy, a public changelog, and advance notice of breaking changes.

### Can I cache Terra responses?

View the Terra Caching Policy at <https://docs.terra.tripadvisor.com/docs/caching-policy>.

***

## Accounts, contracts & compliance

### Will my Content API account and key work after migration?

You should treat the Terra API as a new product, meaning your existing Content API account and key will not be associated with the new one. You will need to create a new account from tripadvisor.com/developers, sign up for a package, and generate a new key.

Your Content API key will be deprecated on **August 31, 2026**.

### Does my existing Tripadvisor contract and invoices be carried over?

While both the Content API and Terra's Discover package is pay-as-you-go, you can treat your new Terra account as a new contract. Any invoices you may have existing with the Content API will not be carried over and should be paid as a separate subscription. Usage on Terra will be sent as a separate invoice.

### Are there new compliance requirements?

Review the updated API Master Terms, Brand Guidelines & Display Requirements, and Review Implementation Policy on the Terra docs portal. Two things to check specifically: confirm your UI attributes Tripadvisor reviews and ratings correctly, and — because Terra now returns review usernames and avatars (not available in the legacy Content API) — ensure your privacy policy covers that data use.
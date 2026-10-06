---
updatedAt: 2026-06-09T17:05:04.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# Moving from Legacy "Mapping" to Allowed Locations

## Migrating from Legacy "Mapping" (Partner API)

If you integrated with Tripadvisor through the legacy **Partner API / Content API**, you previously relied on a feature called **mapping**. Allowed Locations on the Terra platform replaces that feature. This section explains what changes and what you need to do.

### What "mapping" did in the legacy Partner API

In the legacy model, **mapping** was the mechanism that controlled which properties a partner had content access to. In practice:

* You submitted a spreadsheet of your properties — typically with identifiers such as name, full address, and phone number, and in some cases your own internal IDs.
* Tripadvisor ran that submission through an internal matching tool to find the corresponding **Tripadvisor Location IDs**.
* A Tripadvisor team then created and maintained a **mapping** between your IDs and Tripadvisor's IDs, and that mapping determined the content you received.
* Updates were handled either through a managed SFTP file-drop process or by submitting new templates for Tripadvisor to process on your behalf, with turnaround measured in hours to a day.

The defining characteristic of the legacy model is that **Tripadvisor managed the relationship between your IDs and Tripadvisor Location IDs for you**, as a service.

### What changes with Allowed Locations

On the Terra platform, **Tripadvisor no longer maintains a managed mapping of your internal IDs to Tripadvisor Location IDs.** Instead, you work directly with Tripadvisor Location IDs and [manage your own allowlist](https://docs.terra.tripadvisor.com/update/docs/guide-for-managing-allowed-locations) through the API, in real time.

|                                 | Legacy "Mapping" (Partner API)                              | Allowed Locations (Terra)                     |
| ------------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| **Who manages the list**        | Tripadvisor, as a managed service                           | You, directly via the API                     |
| **Identifier used**             | Your internal IDs, mapped to Tripadvisor IDs by Tripadvisor | Tripadvisor Location IDs, used directly       |
| **How updates are made**        | SFTP file drops or submitted templates                      | `POST` requests (APPEND / DELETE / OVERWRITE) |
| **Turnaround**                  | Hours to \~1 day for processing                             | Immediate / real time                         |
| **ID resolution**               | Tripadvisor's internal matching tool                        | Self-service via Catalog Search endpoints     |
| **Ongoing relationship stored** | A persistent ID-to-ID mapping table                         | A list of Location IDs on your allowlist      |

### What this means for you

* **You own the source of truth for which Location IDs you receive.** Adds and removes take effect immediately, without a submission-and-processing cycle.
* **You resolve IDs yourself.** Where Tripadvisor previously matched your properties to Tripadvisor IDs, you now use the [Catalog Search](#finding-the-right-location-ids) endpoints to find Location IDs by name or address. If you maintain a crosswalk between your internal IDs and Tripadvisor Location IDs, keep that crosswalk in your own system — Terra stores only the list of Tripadvisor Location IDs, not the relationship to your IDs.
* **No more SFTP file drops or template submissions** for managing which locations you receive. The managed SFTP mapping process and the internal matching/template workflow are not part of the Terra platform.

> 📘 Migrating an existing mapped portfolio
>
> If you're moving an existing Partner API integration to Terra, the recommended path is to export the Tripadvisor Location IDs already associated with your portfolio and seed your Terra allowlist with them (via APPEND or OVERWRITE). For any properties where you only hold your own internal IDs, use Catalog Search to resolve the Tripadvisor Location IDs first.
>
> Reach out to your account team for help exporting the Location IDs from your existing mapping.
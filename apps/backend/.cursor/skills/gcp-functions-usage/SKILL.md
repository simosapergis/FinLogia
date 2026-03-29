---
name: gcp-functions-usage
description: Fetches and displays Google Cloud Functions usage and invocation counts across all GCP projects, sorted by usage, along with current charges. Use when the user asks for GCP function usage, invocation counts, or Cloud Functions billing.
---

# GCP Functions Usage Tracker

## Instructions
When the user asks to see their Cloud Functions usage across their GCP projects:

1. Execute the usage aggregation script:
   `node .cursor/skills/gcp-functions-usage/scripts/fetch-usage.js`
2. The script will output a formatted Markdown table of functions, invocation counts, and estimated costs for the last 30 days.
3. Present this data clearly to the user, highlighting the most heavily used functions.
4. **Total GCP Cost**: If the user asks for the total cost across all GCP services (Functions, Storage, Firebase, Auth, Hosting, etc.), check if the `BQ_BILLING_TABLE` environment variable is set. If not, instruct the user to set it (e.g., `export BQ_BILLING_TABLE="your-project.your_dataset.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX"`) or provide the direct link to the GCP Billing Console.

## Requirements
- The user must be logged in via `gcloud auth login`.
- The Cloud Monitoring API (`monitoring.googleapis.com`) must be enabled on the queried projects.
- For total GCP cost, Cloud Billing export to BigQuery must be enabled and the `bq` CLI must be authenticated.

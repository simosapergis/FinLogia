import { execSync } from 'child_process';

console.log("Fetching GCP projects...");
let projects = [];
try {
  const projectsJson = execSync('gcloud projects list --format="json"', { encoding: 'utf8' });
  projects = JSON.parse(projectsJson);
} catch (e) {
  console.error("Failed to fetch projects. Are you logged in to gcloud?");
  process.exit(1);
}

console.log(`Found ${projects.length} projects. Fetching access token...`);
let token = "";
try {
  token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
} catch (e) {
  console.error("Failed to get access token.");
  process.exit(1);
}

const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const startTime = thirtyDaysAgo.toISOString();
const endTime = now.toISOString();

const results = [];

console.log("Querying Cloud Monitoring API for each project (last 30 days)...");

for (const project of projects) {
  const projectId = project.projectId;
  
  const filter = encodeURIComponent('metric.type="cloudfunctions.googleapis.com/function/execution_count"');
  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?filter=${filter}&interval.startTime=${startTime}&interval.endTime=${endTime}&aggregation.alignmentPeriod=2592000s&aggregation.perSeriesAligner=ALIGN_SUM`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      continue;
    }

    const data = await res.json();
    if (data.timeSeries) {
      for (const series of data.timeSeries) {
        const functionName = series.resource?.labels?.function_name || 'unknown';
        const region = series.resource?.labels?.region || 'unknown';
        
        let totalInvocations = 0;
        if (series.points) {
          for (const point of series.points) {
            totalInvocations += parseInt(point.value.int64Value || 0, 10);
          }
        }

        if (totalInvocations > 0) {
          results.push({
            project: projectId,
            region,
            functionName,
            invocations: totalInvocations
          });
        }
      }
    }
  } catch (err) {
    // Ignore errors for individual projects
  }
}

results.sort((a, b) => b.invocations - a.invocations);

console.log("\n### Cloud Functions Usage (Last 30 Days)\n");
console.log("| Project | Region | Function | Invocations | Est. Cost (before free tier) |");
console.log("|---------|--------|----------|-------------|------------------------------|");

let totalInvocationsAll = 0;

for (const r of results) {
  const cost = (r.invocations / 1_000_000) * 0.40;
  const costStr = cost < 0.01 ? '< $0.01' : `$${cost.toFixed(2)}`;
  console.log(`| ${r.project} | ${r.region} | ${r.functionName} | ${r.invocations.toLocaleString()} | ${costStr} |`);
  totalInvocationsAll += r.invocations;
}

if (results.length === 0) {
  console.log("| No functions found | - | - | 0 | $0.00 |");
}

console.log("\n**Summary:**");
console.log(`- Total Invocations: ${totalInvocationsAll.toLocaleString()}`);

const totalCostRaw = (totalInvocationsAll / 1_000_000) * 0.40;
const totalCostAfterFreeTier = Math.max(0, ((totalInvocationsAll - 2_000_000) / 1_000_000) * 0.40);

console.log(`- Estimated Total Cost (Raw): $${totalCostRaw.toFixed(2)}`);
console.log(`- Estimated Total Cost (After 2M Free Tier): $${totalCostAfterFreeTier.toFixed(2)}`);
console.log("\n*Note: Cost estimates only cover invocation charges ($0.40/M). Compute time (GB-seconds and GHz-seconds) and networking egress are billed separately and often make up the majority of the cost.*");

// -----------------------------------------------------------------------------
// Total GCP Cost via BigQuery (Optional)
// -----------------------------------------------------------------------------
const bqTable = process.env.BQ_BILLING_TABLE;

if (bqTable) {
  console.log("\n### Total GCP Cost (Current Month)");
  console.log(`Querying BigQuery table: ${bqTable}...`);
  
  const query = `
    SELECT
      SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS total_cost
    FROM \\\`${bqTable}\\\`
    WHERE invoice.month = FORMAT_DATE('%Y%m', CURRENT_DATE())
  `;

  try {
    const bqResultJson = execSync(`bq query --use_legacy_sql=false --format=json "${query}"`, { encoding: 'utf8' });
    const bqResult = JSON.parse(bqResultJson);
    
    if (bqResult && bqResult.length > 0 && bqResult[0].total_cost !== null) {
      const totalCost = parseFloat(bqResult[0].total_cost);
      console.log(`\n**Total GCP Cost (All Services, Current Month): $${totalCost.toFixed(2)}**`);
      console.log("*Includes Functions, Storage, Firebase, Auth, Hosting, etc.*");
    } else {
      console.log("\n**Total GCP Cost:** $0.00 (or no data available for current month yet)");
    }
  } catch (err) {
    console.error("\nFailed to query BigQuery for total cost. Ensure 'bq' CLI is authenticated and the table exists.");
    console.error(err.message);
  }
} else {
  console.log("\n### Total GCP Cost (All Services)");
  console.log("To see your total GCP cost across all services (Storage, Firebase, Hosting, etc.), set the `BQ_BILLING_TABLE` environment variable to your Cloud Billing export table.");
  console.log("Example: `export BQ_BILLING_TABLE=\"your-project.your_dataset.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX\"`");
  console.log("Alternatively, view it in the console: https://console.cloud.google.com/billing");
}


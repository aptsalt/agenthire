---
description: Query observability data and display agent metrics dashboards
---

# Agent Observe Skill

Query the Supabase `agent_metrics` table and display formatted dashboards of agent performance data.

## Instructions

1. **Parse the query from arguments.** The user may specify:
   - An agent name to filter by (e.g., `match-scorer`, `profile-analyst`)
   - A time range (e.g., `1h`, `24h`, `7d`, `30d`). Default to `24h`
   - A metric focus: `latency`, `tokens`, `cost`, `errors`, `cache`, or `all` (default: `all`)

2. **Query the `agent_metrics` table** in Supabase. The table schema is:

   ```sql
   agent_metrics (
     id uuid,
     agent_name text,
     request_id text,
     latency_ms integer,
     input_tokens integer,
     output_tokens integer,
     cache_read_tokens integer,
     cache_write_tokens integer,
     total_tokens integer,
     estimated_cost numeric(10,6),
     cache_hit boolean,
     success boolean,
     error_type text,
     tool_call_count integer,
     created_at timestamptz
   )
   ```

3. **Build and execute the query** using the Supabase client or direct SQL:

   ```bash
   # Using supabase CLI if available
   npx supabase db execute --sql "
     SELECT
       agent_name,
       COUNT(*) as total_requests,
       AVG(latency_ms)::int as avg_latency_ms,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::int as p95_latency_ms,
       SUM(total_tokens) as total_tokens,
       SUM(estimated_cost)::numeric(10,4) as total_cost,
       AVG(CASE WHEN cache_hit THEN 1 ELSE 0 END)::numeric(3,2) as cache_hit_rate,
       SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as error_count,
       AVG(tool_call_count)::numeric(3,1) as avg_tool_calls
     FROM agent_metrics
     WHERE created_at > now() - interval '<time_range>'
       AND (agent_name = '<agent_name>' OR '<agent_name>' = 'all')
     GROUP BY agent_name
     ORDER BY total_requests DESC;
   "
   ```

4. **Display results as a formatted dashboard:**

   ```
   AgentHire Metrics Dashboard (Last 24h)
   ============================================================

   Agent              Requests  Avg Lat  P95 Lat  Tokens   Cost     Cache  Errors
   ----------------------------------------------------------------------------------
   match-scorer       142       1,250ms  2,100ms  328K     $1.22    78%    2
   profile-analyst    98        890ms    1,500ms  195K     $0.72    82%    0
   resume-tailor      67        1,480ms  2,400ms  201K     $0.75    65%    1
   interview-coach    45        1,100ms  1,800ms  112K     $0.42    71%    0
   market-researcher  34        2,200ms  3,500ms  170K     $0.63    45%    3
   ----------------------------------------------------------------------------------
   TOTAL              386       1,384ms  2,260ms  1.01M    $3.74    68%    6
   ```

5. **For detailed views** (when user specifies a metric focus):

   - **latency**: Show latency histogram buckets and time-series trend
   - **tokens**: Break down by input/output/cache_read/cache_write tokens
   - **cost**: Show cost per agent, cost per request, and projected daily/monthly cost
   - **errors**: List recent errors with error_type, agent_name, and timestamps
   - **cache**: Show cache hit rate trend, estimated savings from caching

6. **If Supabase is not accessible**, fall back to reading from local eval results:
   - Check `packages/evals/eval-results/` for recent result files
   - Parse the `tokenUsage` and `latencyMs` fields from eval outputs
   - Display a limited dashboard based on available local data

7. **Highlight anomalies:**
   - Flag agents with error rate > 5%
   - Flag agents with cache hit rate < 50%
   - Flag agents with P95 latency > 3000ms
   - Flag if total daily cost exceeds $10

## Example Usage

```
/agent-observe match-scorer 24h
/agent-observe all 7d latency
/agent-observe errors
/agent-observe
```

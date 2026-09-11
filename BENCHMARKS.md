# Selixes Performance & Reliability Benchmarks

The following metrics are derived from a 360-iteration, fully isolated staging test suite (Node 20.x, simulated network latency, mock provider interfaces, mock load server). Raw logs and the reproducible test suite are available upon request.

| Metric | Value | Condition |
|---|---|---|
| **Circuit-breaker decision latency** | ~16ms (p95: 16.2ms) | Failure detection to routing decision, all 4 failure modes |
| **Cloud-to-cloud failover (total)** | Median 32ms, p95 48ms | Time from upstream failure to first token from standby provider |
| **Mid-stream stutter rate** | 100% | Failures occurring mid-stream cause a visible token-boundary restart (not invisible splicing); pre-TTFT failures are 0% |
| **Local edge failover gap** | Median 125ms, p95 139ms | Full public cloud blackout, failover to local Ollama |
| **Request drop rate (local edge)** | 0% | 0/30 requests dropped during blackout scenario |
| **Unauthorized egress** | 0 calls | Full static + runtime network audit, including logging/telemetry paths |
| **Token savings — high-repetition** | 64.0% | FAQ/support-bot style traffic (30% exact dupes, 34% semantic variants) |
| **Token savings — unique/agentic** | 3.0% | Dynamic, non-repetitive prompts (e.g. coding tasks) |
| **Deploy time — pre-built image** | 32 seconds | `docker compose up` with published image, clean machine |
| **Deploy time — cold source build** | 85 seconds | Full source build with optimized `.dockerignore`, clean machine |
| **Throughput — 50 concurrent users** | 931 TPS | p50 latency 47.89ms, 0 errors |
| **Throughput — 200 concurrent users** | 3,856 TPS | p50 latency 49.53ms, 0 errors |
| **Infra cost (5M req/month)** | $50/mo self-hosted | AWS t3.medium + Redis vs. ~$400/mo typical hosted proxy pricing |

*Note: Selixes numbers are heavily dependent on underlying network topology and workload. Bare numbers without these test conditions should not be treated as absolute guarantees.*

# Scoring

The scorecard uses five dimensions:

- Coupling
- Resilience
- Maintainability
- Security
- Scalability

Each dimension starts with a healthy baseline and applies penalties based on detected findings. The overall score averages the dimensions and applies an additional penalty for high aggregate risk.

## Current MVP

The MVP scoring is deterministic and heuristic-based. It should be treated as an architecture review assistant, not as an absolute quality measure.

## Future Improvements

- Explain every score penalty.
- Allow configurable weights.
- Support organization-specific baselines.
- Track score trends over time.
- Compare services against reference architectures.

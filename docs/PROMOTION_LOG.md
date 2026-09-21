# Promotion log

This file tracks API Guardian launch activity so promotion can be evaluated instead of repeated blindly.

## Current gate

- Repository release: 1.1.0 prepared on main.
- npm release: pending verification/publish.
- External launch posts: intentionally not posted before the matching npm release is live.

## Measurement rules

For each external launch, record:

- date;
- channel and exact thread/post URL;
- message angle;
- npm 7-day downloads before and after;
- GitHub stars/forks/issues before and after;
- meaningful developer feedback;
- whether the channel should be reused.

Do not attribute every npm download to a post. npm downloads can include CI, reinstalls, bots, and repeated installs.

## Channel status

| Channel | Status | Notes |
| --- | --- | --- |
| GitHub | Active | README, topics, issues, launch kit, CI and agent templates are live |
| npm | Blocked on release | Publish 1.1.0 before claiming its features externally |
| Reddit | Ready after npm release | Use explicitly permitted self-promotion threads first |
| DEV Community | Ready after npm release | Publish a technical migration article, not an ad-only post |
| Hacker News | Conditional | Only if Show HN eligibility/culture fit is satisfied; owner writes final copy |
| X / other social | Connection required | Short demo + factual project link after release |
| Product Hunt | Later | Use after real-user feedback and a polished demo, not as the first validation channel |

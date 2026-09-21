# Releasing API Guardian

API Guardian should be published from GitHub Actions using npm trusted publishing (OIDC), not a long-lived npm write token.

## One-time npm setup

On npmjs.com, open the settings for `openai-api-guardian` and add a GitHub Actions trusted publisher with:

- GitHub user or organization: `ijisaegis-prog`
- Repository: `openai-api-guardian`
- Workflow filename: `publish.yml`
- Allowed action: direct `npm publish`

Do not add an npm write token to the repository.

## Release procedure

1. Prepare the version and changelog on a release branch.
2. Run CI and review the npm package dry-run.
3. Merge the release PR into `main`.
4. Merge the release PR into `main`. A change to `package.json` or `package-lock.json` automatically triggers **Publish npm**.
5. The publish workflow independently reruns tests and package verification, then publishes only when the local version is not already on npm.
6. Confirm the published npm version and provenance.
7. Only then launch the external promotion posts for the new features.

The workflow may also be started manually with `workflow_dispatch` when a safe retry is needed.

The publish workflow:

- runs only when dispatched from `main`;
- uses a GitHub-hosted runner;
- requests OIDC `id-token: write` permission;
- runs tests and `npm pack --dry-run` before publishing;
- skips an already-published version without failing;
- automatically runs for verified version-file changes on `main`;
- publishes directly to the public npm registry.

## Emergency rule

If publishing fails, do not bump the version repeatedly. First identify whether the failure is CI, npm trusted-publisher configuration, package ownership, 2FA, or registry availability.

# Contributing

Thanks for helping make evaluation models easier to use. Bug reports, small examples and clearer explanations are welcome.

## Local development

Use Node.js 22 or 24, install with `npm ci`, then run `npm run check`. Tests use fixtures and never make paid model calls. `npm run dev` starts the website; `npm run dev:api` starts its API with your own `AI_GATEWAY_API_KEY`.

Keep the core independent of provider SDKs. Provider adapters translate a single evaluation operation. Preserve evidence and missing metadata; do not invent confidence. Add tests for observable behavior, cancellation, invalid responses and type inference when a change affects those contracts.

Before a pull request, run `npm run check` and `npm pack --dry-run -w sysone`. Update the library reference and changelog for public API changes. Keep credentials, submitted user data, generated tarballs and deployment files out of Git.

## Releases

The package lives in `packages/sysone`. Set its version, update `CHANGELOG.md`, run the checks and inspect the package contents. Publish the initial package with a maintainer's authenticated npm session. Configure the npm trusted publisher for `sysone-help/sysone`, workflow `release.yml`, before using automated releases. The workflow uses OIDC and provenance; it does not require a long-lived npm token.

For later releases, create a GitHub release with a matching `vX.Y.Z` tag. The workflow verifies that the package version matches the release tag before publishing. The first release may be published manually; do not publish it a second time through the workflow.

Production deployments can be performed with `vercel --prod` from the repository root. The Vercel Hobby plan does not integrate Git repositories owned by organizations, so deployment is currently a maintainer CLI operation. Do not change account plans merely to enable that integration.

## Community

Be respectful and concrete. Describe the input, expected behavior and observed behavior when reporting an issue, using anonymized examples. Never include API keys or private messages. Security reports belong in the private reporting channel described in `SECURITY.md`.

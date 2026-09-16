# Shared dependency layer for every LEOPARD image.
#
# Why this exists: `RUN --mount=type=cache` caches pnpm's package store, but
# BuildKit still re-executes the install step on every build. Because a build is a
# chain, one re-run install invalidates every layer after it, so a one-line source
# change cost each app image its full `pnpm install` (60-90s) plus every compile
# step that follows.
#
# Installing once here and having the app Dockerfiles start from this image
# removes the install from the per-commit path entirely: an app rebuild only
# re-runs its own copy + compile/export layers. The image is tagged with a hash
# of the files below, so a lockfile change builds a new one automatically and
# otherwise it is reused as-is.
#
# This is a normal image, not a build-only artefact: it is intentionally large
# (all workspaces installed) because its layers are shared with every image that
# derives from it. Final image sizes are unaffected — the runner stages still copy
# only what they need.

FROM node:24.21.0-alpine3.24
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /app

# Root manifest first: `typescript` (the tsc used by every build script) is a root
# devDependency.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Every workspace manifest, so `pnpm install --frozen-lockfile` resolves the whole
# lockfile rather than the subset each app happens to need.
COPY packages/config/package.json packages/config/
COPY packages/config/tsconfig/ packages/config/tsconfig/
COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/validators/package.json packages/validators/
COPY packages/validators/tsconfig.json packages/validators/
COPY packages/ui/package.json packages/ui/
COPY packages/ui/tsconfig.json packages/ui/
COPY packages/mobile-core/package.json packages/mobile-core/
COPY packages/mobile-core/tsconfig.json packages/mobile-core/
COPY apps/api/package.json apps/api/
COPY apps/api/tsconfig.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY apps/admin/tsconfig.json apps/admin/
COPY apps/admin/next.config.mjs apps/admin/
COPY apps/admin/postcss.config.mjs apps/admin/
COPY apps/mobile/package.json apps/mobile/
COPY apps/mobile/tsconfig.json apps/mobile/
COPY apps/mobile/metro.config.js apps/mobile/
COPY apps/mobile/app.json apps/mobile/
COPY apps/driver/package.json apps/driver/
COPY apps/driver/tsconfig.json apps/driver/
COPY apps/driver/metro.config.js apps/driver/
COPY apps/driver/app.json apps/driver/

ENV CI=true

# pnpm 10+ reads storeDir from pnpm-workspace.yaml; .npmrc is ignored for it. The
# directory is the BuildKit cache mount, so a rebuild of this image reuses already
# downloaded packages instead of re-fetching them.
RUN printf '\nstoreDir: /pnpm/store\n' >> pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Replibot Architecture

## Purpose

Replibot is a desktop-first builder for local private apps and widgets aimed at non-coders.

The first architectural rule is that generated apps do not get direct access to Electron, Node.js, browser cookies, or arbitrary network access.

## Initial Layers

- `electron/`
  Hosts the trusted shell, windows, IPC handlers, and future file system integrations.
- `src/`
  React renderer for workspace, builder, library, and widget management.
- `shared/`
  Type contracts shared between trusted Electron code and the renderer.
- `docs/`
  Product and technical decisions that define the harness.

## Security Boundary

The renderer only talks to Electron through the preload bridge exposed as `window.replibot`.

The preload bridge should expose narrow capability APIs instead of raw `ipcRenderer` or unrestricted process access.

Generated apps should eventually run in a dedicated harness with:

- Manifest-declared permissions
- Project-scoped storage
- Controlled UI primitives
- Explicit AI provider access
- No bearer token injection
- No unrestricted `fetch`
- No direct filesystem access

## Near-Term Build Plan

1. Add local workspace persistence for projects and manifests.
2. Add a builder flow that captures intent, template, and required permissions.
3. Add a runtime harness separate from the main renderer.
4. Add widget hosting and pinned utility surfaces.
5. Add packaging and installer workflow for Electron distribution.

## Local Workspace Layout

The Electron shell currently stores local workspace data under the app data directory:

- `workspace/projects/<project-id>/manifest.json`
- `workspace/projects/<project-id>/spec.json`
- `workspace/projects/<project-id>/src/main.ts`

This is the first step toward a full project model with versions, assets, and generated outputs.

Projects can now be edited through the shell-backed workspace UI, which persists:

- project manifest metadata
- builder goal/spec content
- entrypoint source text

## Preview Harness

The current preview harness runs project source inside a sandboxed iframe with:

- no direct Electron access
- no direct preload bridge access
- no unrestricted network access
- project-scoped `storage.get` and `storage.set`
- simple `ui.render`, `ui.setTitle`, and `ui.notify`

Runtime state is persisted by the shell into a per-project JSON file and synchronized through explicit preview messages.

## Installer Packaging

Replibot is now configured for installer packaging with `electron-builder`.

The current packaging target is Windows NSIS so the app can be distributed as a local desktop installer rather than just a development shell.

The NSIS installer now includes a custom provider setup page that captures provider label, endpoint, model, and API key into `resources/config/installer.runtime.json`.

## AI Assistance

The AI assistance layer runs through the Electron main process so provider credentials stay out of the renderer and out of the preview harness.

The current supported implementation is a local OpenAI-compatible API configuration using installer defaults plus user-provided local overrides.

Installer-time defaults are packaged from `config/installer.defaults.json` or `config/installer.generated.json`.

Runtime configuration precedence is:

1. `installer.runtime.json`
2. `installer.generated.json`
3. `installer.defaults.json`

Generated source is validated before it is accepted into a project. The current validation blocks unsupported capabilities such as direct `fetch`, `require`, Electron APIs, and Node process access, then runs a bounded repair and polish loop before accepting the output.

The builder now surfaces a richer generation report in the renderer, including attempt history, accepted attempt number, remaining warnings, expected user flow, and intended storage usage.

We are not treating ChatGPT sign-in as a generic OAuth provider for this app because OpenAI currently documents that sign-in path for Codex CLI and IDE usage, not for arbitrary third-party desktop app auth.

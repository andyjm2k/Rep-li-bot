# Replibot

Replibot is a local-first app and widget builder for non-coders.

This folder is the root for the new project so it can be moved into its own repository without affecting the existing VibeCraftAcademy codebase.

## Initial Direction

- Desktop-first Electron application
- Local private apps and widgets
- Secure runtime harness for UI, data handling, and permissions
- AI-driven building workflow using Codex with a ChatGPT subscription
- Simple experience for non-technical users

## Current Foundation

- Standalone Electron shell entrypoint
- Secure preload bridge contract
- React renderer scaffold
- Shared harness type definitions
- Initial architecture notes in `docs/architecture.md`
- Local project workspace and sandboxed preview harness
- Structured builder brief for non-coder project generation
- Installer packaging foundation for Electron distribution

## Packaging

- `npm run dist:dir`
  Produces an unpacked desktop bundle in `release/win-unpacked`
- `npm run dist:win`
  Produces a Windows installer in `release/`
- The Windows NSIS installer now includes an AI provider setup page for:
  - provider label
  - base URL or endpoint
  - model
  - API key

## AI Layer

- `Replibot` now uses a local OpenAI-compatible API configuration path through the Electron main process.
- The API key is stored locally in the workspace and is not exposed to the iframe preview harness.
- Installer defaults come from `config/installer.defaults.json` or `config/installer.generated.json`.
- Installer-entered values are written to `resources/config/installer.runtime.json` and take precedence over packaged defaults.
- Packaging scripts can inject provider defaults with:
  - `REPLIBOT_AI_PROVIDER_LABEL`
  - `REPLIBOT_AI_FORMAT`
  - `REPLIBOT_AI_BASE_URL`
  - `REPLIBOT_AI_MODEL`
  - `REPLIBOT_AI_API_KEY`
- AI code generation validates the returned source before saving it and performs one repair pass if the first draft is invalid or requests blocked APIs.
- The richer generation loop now records attempt history, review warnings, user-flow notes, and storage notes so the builder can show why a result was accepted.
- The current implementation does not use generic ChatGPT OAuth inside the app.

## Next Step

Connect the structured builder flow to AI-assisted generation and package installers for distribution.

# @opentritium/dsh-codex-shim

[中文说明](README.zh.md)

This plugin simulates Codex-style prompts, tool vocabulary, tool results, and WebUI presentation for selected model routes, helping GPT-family and other Codex-adapted models use tools more reliably.

This is a shim, not a Codex runtime. It does not start a Codex app-server, handle Codex OAuth, provide models or credentials, execute commands by itself, or provide a web-search backend. It consumes existing DSH capabilities only through public service definitions, consumers, and UI slots; when a model does not match or the bundle is removed, DSH continues with its normal tools and behavior.

## Install in a profile

The examples below install the bundle into the WebUI `web` profile. `dsh plugin` owns the profile manifest and dependency list.

#### Download the Release tarball with `gh`

```sh
gh release download v0.1.2 --repo LiuRJ99/dsh-codex-shim --pattern 'opentritium-dsh-codex-shim-*.tgz'
pnpm dsh plugin --profile web add ./opentritium-dsh-codex-shim-*.tgz
pnpm dsh --profile web --dump-config
```

Without GitHub CLI, download the same latest-release asset with `curl` and `jq`:

```sh
curl -fsSL https://api.github.com/repos/LiuRJ99/dsh-codex-shim/releases/tags/v0.1.2 \
  | jq -r '.assets[] | select(.name | endswith(".tgz")) | .browser_download_url' \
  | xargs -r curl -fLO
pnpm dsh plugin --profile web add ./opentritium-dsh-codex-shim-*.tgz
pnpm dsh --profile web --dump-config
```

**If the bundled `gpt-5.6-*` rule is enough, skip the configuration section below.**

### Configure through a configuration file

Configure this plugin through the profile's settings provider. The default file-backed provider uses `$DSH_HOME/settings.yaml` (normally `~/.dsh/settings.yaml`); create or edit its `codex-shim:` section. The bundled `gpt-5.6-*` automatic rule remains in force until `modelPatterns` is explicitly set.

```yaml
codex-shim:
  enabled: true
  modelPatterns:
    - gpt-5.6-*
    - deepseek-v4-*
  modelOverrides:
    - provider: openai
      model: gpt-5.6-luna
      enabled: true
    - provider: example-provider
      model: experimental-model
      enabled: false
```

`enabled: false` turns the shim off globally. `modelPatterns` replaces the automatic-rule list; use `modelPatterns: []` to disable automatic matching. Each `modelOverrides` row is an exact provider/model decision and takes precedence over the patterns. Omit the row to let that model follow the automatic rules. Provider and model must exactly match the resolved DSH route.

The file-backed settings provider watches valid edits, so the route policy updates live. If a profile uses another settings provider, configure the same namespace through that provider instead.

### DSH compatibility

Release `v0.1.2` is composition-tested against DSH `0.1.5-rc.1` at exact commit `183f08e9c6dde7e36cd2318eaee70b0da08fb35e`. This DSH release exposes external settings through the normal settings client path, so no source patch is required. The client half uses the current `ctx.settings.installSection`, `ctx.remote.session.modelCatalog()`, `tool.call.toolview`, and `tool.call.images` contracts.

### Uninstall

Removing the bundle restores the plain DSH profile composition:

```sh
pnpm dsh plugin --profile web remove @opentritium/dsh-codex-shim
pnpm dsh --profile web --dump-config
```

`dsh plugin remove` removes the profile dependency and its bundle layer. To clear saved shim preferences as well, delete the complete `codex-shim:` section from `$DSH_HOME/settings.yaml`; the file-backed settings provider reloads valid edits.

## Route and configuration

The bundle mounts the gate globally, but the Codex surface is applied only when all of these are true:

- the global switch is enabled;
- the resolved model matches an automatic pattern or an exact model override enables it;
- the current scope contains at least one shim tool.

The default automatic pattern is `gpt-5.6-*`. Users can replace it with patterns such as `deepseek-v4-*`, set it to an empty list to disable automatic matching, or use explicit provider/model overrides. The UI exposes the same settings through the DSH settings slot.

## Shim tools

The following tools are registered by the bundle and advertised only on an active Codex route. “Degraded” means the underlying DSH capability cannot provide the complete Codex operation.

| Tool           | Status      | DSH capability                        | Notes                                                                                                                                                                   |
| -------------- | ----------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exec_command` | Available   | `ctx.shell`, sandbox policy, approval | Runs commands, returns bounded output, and keeps sessions for later polling.                                                                                            |
| `write_stdin`  | Degraded    | `ShellProcess` reads                  | Polls an existing session. Non-empty stdin is rejected because the current DSH shell definition has no stdin-write operation.                                           |
| `apply_patch`  | Available   | `ctx.fs`, `ctx.shell`                 | Supports Codex patch markers, file add/delete/update/move, and fuzzy hunk matching. Binary file deletion succeeds without a text diff. `apply-patch` and `applypatch` remain compatibility aliases but are not advertised. |
| `view_image`   | Conditional | `ctx.fs`, attachment service          | Reads PNG, JPEG, WebP, and GIF files when the profile provides filesystem and image-attachment capabilities.                                                            |
| `update_plan`  | Available   | Durable `todo/write` session event    | Stores `pending`, `in_progress`, and `completed` steps with at most one active step.                                                                                    |
| `web_run`      | Search-only | `ctx.web.search()`                    | Accepts multiple `search_query` items and returns provider sources. It does not implement `open`, `click`, `find`, screenshots, or arbitrary fetch.                     |

## Masked tools

When a replacement tool is present, the gate hides overlapping host tools from the active prompt advertisement. It does not unregister them, so the host surface returns when the route changes or the shim is removed.

| Shim tool present              | Masked host tools                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `exec_command`                 | `bash`, `pwsh`, `read`, `glob`, `grep`                                                                  |
| `exec_command` + `write_stdin` | `terminal_close`, `terminal_list`, `terminal_open`, `terminal_read`, `terminal_send`, `terminal_signal` |
| `apply_patch`                  | `edit`, `str_replace_editor`, `write`                                                                   |
| `view_image`                   | `read_image`                                                                                            |
| `update_plan`                  | `todo_write`                                                                                            |
| `web_run`                      | `web_search`                                                                                            |

Masking is scope-aware. If a prerequisite tool is not resolvable in the current composition, its mask is not applied.

## Limitations

- `write_stdin` is a polling adapter, not a full interactive terminal. A generic DSH shell definition and provider are required for stdin writes, signals, and terminal control.
- `web_run` is intentionally search-only. A future page-reference or web-fetch provider should add those capabilities through a separate DSH seam; this package does not ship an OpenAI-hosted provider.
- Patch interception covers direct Codex patch invocations. A patch hidden inside a larger shell script is left to the shell instead of being guessed.
- Tool availability follows profile composition. Missing shell, filesystem, or attachment capabilities produce explicit failures rather than simulated success.

The shim consumes capability definitions; it does not choose or implement providers. Provider selection remains the responsibility of the DSH profile.

## TODO / Roadmap

These items are deferred work; they are not current capabilities:

- **OpenAI Responses web fetch:** add a separate DSH web definition/provider that uses the active Responses endpoint for the matched route, then expose page references, navigation, and fetch operations only when the provider supports them. Keep `web_run` search-only when it does not. Do not hardcode an endpoint or add an OpenAI-hosted search provider to this shim.
- **Interactive terminal:** extend the generic DSH shell definition and providers with stdin writes, signals, session listing/open/close, PTY behavior, and cross-platform parity; then upgrade `write_stdin` and session handling without claiming unsupported operations.
- **Windows compatibility:** add Windows CI coverage for bundle installation, profile composition, supported tool behavior, and WebUI startup before claiming Windows support.
- **Codex parity:** compare tool schemas, argument validation, errors, lifecycle behavior, permission prompts, transcript events, and WebUI presentation against the referenced Codex release. Add composition and acceptance tests for every supported capability before widening the surface.

The goal is the closest practical Codex experience over DSH capabilities. Runtime, OAuth, and Responses wire-protocol compatibility remain outside this package.

## Compatibility

| Component        | Supported baseline                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DeepSeek Harness | Tarball installation is pinned to commit `183f08e9c6dde7e36cd2318eaee70b0da08fb35e` (`0.1.5-rc.1`); no source patch is required.                                                                         |
| DSH peers        | `@deepseek-ai/dsh-*` peers target `>=0.1.5-rc.1 <0.2.0`; Cordis targets `^4.0.2` so the plugin does not install a second Cordis runtime.                                                  |
| Node.js          | `^22.19.0` or `>=24.0.0`.                                                                                                                                                                      |
| React/WebUI      | React 18; browser code uses DSH locale, settingsScope/settings, remote, renderer, conversation, and slot APIs.                                                                                   |
| Codex reference  | `@openai/codex` / `codex-cli 0.147.0`, used as the tool-name, patch-behavior, and app-server product reference. This package does not claim full Codex runtime or wire-protocol compatibility. |

Each shim release is composition-tested against the listed baseline. Recheck tool schemas, prompt sections, approval/sandbox fields, and WebUI slot contracts after upgrading DSH or Codex.

**Windows:** behavior and compatibility on Windows are not yet tested. Development and testing target Unix-style shell and filesystem semantics; please report issues if you run into problems on Windows.

## Development

```sh
pnpm install
pnpm run check
pnpm run bench
```

The published package includes `lib/`, `cordis.patch.yml`, both README files, and the license. Source persona and locale assets are bundled during `tsdown` build.

Pushing a `vX.Y.Z` tag that exactly matches `package.json` runs the GitHub Actions release workflow. It verifies the pinned DSH source integration, runs `pnpm run check`, and attaches the packed tarball to a GitHub Release; it does not publish to npm.

## License

MIT. See [LICENSE](LICENSE).

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { CodexToolRow } from './CodexToolRow.tsx'
import { CodexSettingsCard, cardFace } from './CodexSettingsCard.tsx'
import { mount as mountSettingsCss, dispose as disposeSettingsCss } from './CodexSettingsCard.module.css'
import { mount as mountToolRowCss, dispose as disposeToolRowCss } from './CodexToolRow.module.css'
import { CODEX_SETTINGS_NS, CodexSettingsCardController } from './settings-card-controller.ts'
import { en, NS, zh, type CodexKey } from './locales/index.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    codex: CodexKey
  }
}

export const inject = ['slots', 'locale']

const CODEX_TOOL_NAMES = ['exec_command', 'write_stdin', 'apply_patch', 'view_image', 'update_plan', 'web_run'] as const

export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    mountToolRowCss()
    mountSettingsCss()
    return () => {
      disposeSettingsCss()
      disposeToolRowCss()
    }
  }, 'ui-codex: styles')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-codex: dictionaries')
  ctx.slots.inject('tool.call.toolview', function* () {
    for (const key of CODEX_TOOL_NAMES) {
      yield ctx.slots.register(
        {
          name: 'tool.call.toolview',
          key,
          locale: NS,
          ...(key === 'view_image'
            ? { children: { 'tool.call.images': { kind: 'single' as const, scope: 'session' as const } } }
            : {}),
          ...(key === 'web_run' ? { priority: -1 } : {}),
        },
        CodexToolRow,
      )
    }
  })
  // Settings is an optional browser surface. Keep its dependency out of the
  // root plugin so a WebUI without the settings transport still gets tool rows.
  ctx.inject(['settingsScope', 'remote'], installSettings)
}

function installSettings(ctx: ClientContext): void {
  const settings = new CodexSettingsCardController(
    ctx.settingsScope.bind({ namespace: CODEX_SETTINGS_NS }),
    ctx.remote,
  )
  ctx.effect(() => () => settings.dispose(), 'ui-codex-shim: settings controller')
  ctx.slots.inject('settings.plugin.item', () =>
    ctx.slots.register(
      {
        name: 'settings.plugin.item',
        key: CODEX_SETTINGS_NS,
        locale: NS,
        inject: () => cardFace(settings),
      },
      CodexSettingsCard,
    ),
  )
}

import type { DiffBlockLabels, WebBlockLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'

type Translate = PropsLocale<'codex'>['t']

export function diffBlockLabels(t: Translate): DiffBlockLabels {
  return {
    copy: t('row.copy'),
    copied: t('row.copied'),
    collapseAria: t('row.diffCollapseAria'),
    expandAria: count => t('row.diffExpandAria', { count }),
    collapse: t('row.collapse'),
    expand: count => t('row.diffExpandRest', { count }),
    files: count => t(count === 1 ? 'row.diffFilesOne' : 'row.diffFilesOther', { count }),
  }
}

export function webBlockLabels(t: Translate): WebBlockLabels {
  return {
    noResults: t('row.webNoResults'),
    sourcesTruncated: t('row.webSourcesTruncated'),
    http: t('row.webHttp'),
    contentTruncated: t('row.webContentTruncated'),
    markdown: {
      code: { copyLabel: t('row.copy'), copiedLabel: t('row.copied') },
      footnotes: t('row.markdownFootnotes'),
    },
  }
}

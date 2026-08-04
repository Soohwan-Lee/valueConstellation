'use client'

import Link from 'next/link'
import { EMBEDDING_MODEL, MODEL } from '@/lib/models'
import { t, type Lang } from '@/lib/i18n'

/**
 * What produced this map, at the bottom of the rail.
 *
 * The full account lives on the reference page, and did so before this existed
 * — but a page nobody can reach from the thing it describes is a page nobody
 * reads. Somebody looking at a map and wondering what "similar" means has no
 * reason to guess there is a URL for it.
 *
 * So: the two model names in plain sight, and one link. The names are the
 * question people actually ask first, and printing them here rather than
 * summarising them ("an OpenAI model") means the answer can be checked against
 * the code, which is where these constants come from.
 */
export function MethodFooter({ lang }: { lang: Lang }) {
  return (
    <div className="border-t border-[var(--line)] px-5 py-4">
      <div className="eyebrow mb-2">{t('builtWith', lang)}</div>
      <dl className="space-y-1">
        {[
          [t('builtWithRead', lang), MODEL],
          [t('builtWithPlace', lang), EMBEDDING_MODEL],
        ].map(([label, value]) => (
          <div key={value} className="flex items-baseline gap-2">
            <dt className="shrink-0 text-[11.5px] text-[var(--muted)]">{label}</dt>
            <dd className="readout min-w-0 truncate text-[11px] text-[var(--body)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <Link
        href="/how-it-works"
        className="mt-2.5 inline-block text-[11.5px] text-[var(--muted)] underline decoration-[var(--line-strong)] underline-offset-[3px] transition-colors hover:text-[var(--ink)]"
      >
        {t('builtWithMore', lang)}
      </Link>
    </div>
  )
}

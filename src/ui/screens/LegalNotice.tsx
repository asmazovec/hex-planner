import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionTitle } from '../primitives/SectionTitle';

const ASYNC_TI4 = 'https://github.com/AsyncTI4/TI4_map_generator_bot';
const SOURCE = 'https://github.com/asmazovec/hex-planner';
const CC_BY_3 = 'https://creativecommons.org/licenses/by/3.0/';

function Link({ href, children }: { href: string; children: string }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}

/** The project's legal notices, each kind under its own heading so they do not mix. */
export function LegalNotice() {
  const { t } = useTranslation();
  const part = (id: string, body: ReactNode) => (
    <section className="legal-part" aria-labelledby={`legal-${id}`}>
      <SectionTitle as="p" className="side-label" id={`legal-${id}`}>{t(`legal.${id}.title`)}</SectionTitle>
      <p className="side-note">{body}</p>
    </section>
  );
  return (
    <div className="side-group legal-notice">
      {part('unofficial', t('legal.unofficial.text'))}
      {part('data', <>{t('legal.data.text')} <Link href={ASYNC_TI4}>AsyncTI4/TI4_map_generator_bot</Link>. {t('legal.data.wording')}</>)}
      {part('icons', <>{t('game.iconCredit')} <Link href={CC_BY_3}>{t('game.iconLicence')}</Link></>)}
      {part('code', <>{t('legal.code.text')} <Link href={SOURCE}>github.com/asmazovec/hex-planner</Link></>)}
    </div>
  );
}

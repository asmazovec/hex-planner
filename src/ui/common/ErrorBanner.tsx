import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../../state/gameStore';
import { Banner } from '../feedback/Banner';
import { downloadGame } from './download';

/** An error with the way out it needs: the open game can still be saved to a file. */
export function ErrorBanner({ message }: { message: ReactNode }) {
  const { t } = useTranslation();
  const saved = useGame(s => s.saved);
  return (
    <Banner
      kind="error"
      message={message}
      action={saved ? { label: t('banner.export'), onClick: () => downloadGame(saved) } : undefined}
    />
  );
}

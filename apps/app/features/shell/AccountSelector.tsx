import { Select } from '@repo/ui';
import type { SelectOption } from '@repo/ui';
import { useTranslation } from 'react-i18next';

import { useFilterStore } from './filterStore';
import type { FilterAccountId } from './filterStore';
import { SAMPLE_ACCOUNTS } from './sampleAccounts';

/**
 * Sélecteur de compte du header (M1-4/M1-8, ARCHITECTURE §6.1) : « Tous les
 * comptes » + comptes factices (`sampleAccounts`, remplacés par de vrais
 * comptes Supabase en M2) — `Select` (`packages/ui`, M1-4).
 */
export function AccountSelector() {
  const { t } = useTranslation('common');
  const accountId = useFilterStore((state) => state.accountId);
  const setAccountId = useFilterStore((state) => state.setAccountId);

  const options: readonly SelectOption<FilterAccountId>[] = [
    { value: 'all', label: t('header.accounts.all') },
    ...SAMPLE_ACCOUNTS.map((account) => ({
      value: account.id,
      label: t(`header.accounts.sample.${account.nameKey}`),
    })),
  ];

  return (
    <Select
      testID="header-account"
      options={options}
      value={accountId}
      onChange={setAccountId}
      label={t('header.accounts.triggerAccessibility')}
      closeAccessibilityLabel={t('common.close')}
    />
  );
}

import { Button, Card, themes, useThemeMode } from '@repo/ui';
import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { DropdownOption } from './DropdownOption';
import { useFilterStore } from './filterStore';
import { SAMPLE_ACCOUNTS } from './sampleAccounts';

/**
 * Sélecteur de compte du header (M1-8, ARCHITECTURE §6.1) : « Tous les
 * comptes » + comptes factices (`sampleAccounts`, remplacés par de vrais
 * comptes Supabase en M2). Liste simple en attendant `Sheet`/`Select` (M1-4).
 */
export function AccountSelector() {
  const { t } = useTranslation('common');
  const mode = useThemeMode();
  const [open, setOpen] = useState(false);
  const accountId = useFilterStore((state) => state.accountId);
  const setAccountId = useFilterStore((state) => state.setAccountId);

  const selectedAccount = SAMPLE_ACCOUNTS.find((account) => account.id === accountId);
  const selectedLabel =
    accountId === 'all'
      ? t('header.accounts.all')
      : t(`header.accounts.sample.${selectedAccount?.nameKey ?? 'main'}`);

  return (
    <View testID="header-account" className="relative">
      <Button
        testID="header-account-trigger"
        label={selectedLabel}
        variant="secondary"
        size="sm"
        icon={<ChevronDown size={14} color={themes[mode].textPrimary} />}
        accessibilityLabel={t('header.accounts.triggerAccessibility')}
        onPress={() => setOpen((value) => !value)}
      />
      {open ? (
        <Card
          testID="header-account-options"
          className="absolute top-12 left-0 z-50 min-w-56 gap-xs p-xs"
        >
          <DropdownOption
            testID="header-account-option-all"
            label={t('header.accounts.all')}
            selected={accountId === 'all'}
            onPress={() => {
              setAccountId('all');
              setOpen(false);
            }}
          />
          {SAMPLE_ACCOUNTS.map((account) => (
            <DropdownOption
              key={account.id}
              testID={`header-account-option-${account.id}`}
              label={t(`header.accounts.sample.${account.nameKey}`)}
              selected={accountId === account.id}
              onPress={() => {
                setAccountId(account.id);
                setOpen(false);
              }}
            />
          ))}
        </Card>
      ) : null}
    </View>
  );
}

import { useTranslation } from "react-i18next"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { SAMPLE_ACCOUNTS } from "./sampleAccounts"

export interface AccountSelectorProps {
  readonly accountId: string
  readonly onChange: (accountId: string) => void
}

/**
 * Sélecteur de compte du header (W-5, ARCHITECTURE §6.1) : « Tous les
 * comptes » + comptes factices (`sampleAccounts`, remplacés par de vrais
 * comptes Supabase en M2) — `Select` shadcn (`components/ui/select`).
 */
export function AccountSelector({ accountId, onChange }: AccountSelectorProps) {
  const { t } = useTranslation()

  return (
    <Select value={accountId} onValueChange={onChange}>
      <SelectTrigger
        data-testid="header-account-trigger"
        size="sm"
        aria-label={t("header.accounts.triggerAccessibility")}
        className="min-h-11"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("header.accounts.all")}</SelectItem>
        {SAMPLE_ACCOUNTS.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {t(`header.accounts.sample.${account.nameKey}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Мессенджер инстанса. API у них общий, отличаются правила поиска собеседника. */
export type InstanceType = 'max' | 'telegram';

export const INSTANCE_LABELS: Record<InstanceType, string> = {
  max: 'MAX',
  telegram: 'Telegram',
};

/** По полю `typeInstance` из getSettings: `v3` — MAX, `telegram` — Telegram. */
export function detectInstanceType(typeInstance: string | undefined): InstanceType | null {
  if (typeInstance === 'telegram') return 'telegram';
  if (typeInstance === 'v3' || typeInstance === 'max') return 'max';
  return null;
}

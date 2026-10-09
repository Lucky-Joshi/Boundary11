import { formatINR } from '@boundary11/shared';

export function Money({ paise, withDecimals = true }) {
  return <>{formatINR(paise, { withDecimals })}</>;
}

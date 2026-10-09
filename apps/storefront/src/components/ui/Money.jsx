import { formatINR } from '@boundary11/shared';

/** Renders an integer paise amount as an Indian currency string. */
export function Money({ paise, withDecimals = true }) {
  return <>{formatINR(paise, { withDecimals })}</>;
}

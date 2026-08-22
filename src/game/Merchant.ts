export interface Merchant {
  id: string;
  row: number;
  col: number;
  used: boolean;
}

export function createMerchant(id: string, row: number, col: number): Merchant {
  return {
    id,
    row,
    col,
    used: false,
  };
}

export function merchantId(row: number): string {
  return `merchant-${row}`;
}

export type MerchantOfferId = 'heal' | 'attack';

/** Travelling Merchant instance. Owns used/purchased state for one visit. */
export class Merchant {
  readonly id: string;
  readonly row: number;
  readonly col: number;
  private _used = false;
  private readonly purchasedOffers: Record<MerchantOfferId, boolean> = {
    heal: false,
    attack: false,
  };

  constructor(id: string, row: number, col: number) {
    this.id = id;
    this.row = row;
    this.col = col;
  }

  get used(): boolean {
    return this._used;
  }

  hasPurchased(offerId: MerchantOfferId): boolean {
    return this.purchasedOffers[offerId];
  }

  markPurchased(offerId: MerchantOfferId): void {
    this.purchasedOffers[offerId] = true;
  }

  markUsed(): void {
    this._used = true;
  }
}

export function createMerchant(id: string, row: number, col: number): Merchant {
  return new Merchant(id, row, col);
}

export function merchantId(row: number): string {
  return `merchant-${row}`;
}

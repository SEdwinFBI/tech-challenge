import { DomainError } from './domain.error';

export class Money {
  private readonly amountInCents: number;

  private constructor(amountInCents: number) {
    if (!Number.isInteger(amountInCents) || amountInCents < 0) {
      throw new DomainError('El monto no puede ser negativo.', 'MONTO_NEGATIVO', 400);
    }
    this.amountInCents = amountInCents;
  }

  public static fromDecimal(amount: number): Money {
    return new Money(Math.round(amount * 100));
  }

  public add(other: Money): Money {
    return new Money(this.amountInCents + other.amountInCents);
  }

  public subtract(discount: Money): Money {
    return new Money(Math.max(0, this.amountInCents - discount.amountInCents));
  }

  public get value(): number {
    return Number((this.amountInCents / 100).toFixed(2));
  }

  public get netAmount(): number {
    return Number((this.value / 1.12).toFixed(2));
  }

  public get iva(): number {
    return Number((this.value - this.netAmount).toFixed(2));
  }
}

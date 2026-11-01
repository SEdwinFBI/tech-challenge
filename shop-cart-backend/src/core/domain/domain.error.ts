
export class DomainError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string = 'DOMAIN_RULE_VIOLATION',
    public readonly httpStatus: number = 400
  ) {
    super(message);
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
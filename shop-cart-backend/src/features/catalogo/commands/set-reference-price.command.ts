import { DomainError } from '@/core/domain/domain.error';
import { ICommandHandler } from '@/core/cqrs/index';
import { ICatalogRepository } from '../abstracts/catalogo.repository.interface';
import { SetReferencePriceCommand } from '../models/catalogo.schema';
import { CatalogRepository } from '../repository/catalogo.repository';

// Solo se muestra tachado. El cobro usa Variantes.Precio.
export class SetReferencePriceCommandHandler implements ICommandHandler<SetReferencePriceCommand, void> {
  constructor(private readonly repo: ICatalogRepository = new CatalogRepository()) {}

  async handle(cmd: SetReferencePriceCommand): Promise<void> {
    if (cmd.precioReferencia !== null && !(cmd.precioReferencia > 0)) {
      throw new DomainError('El precio de referencia debe ser mayor a cero.', 'INVALID_REFERENCE_PRICE', 400);
    }
    await this.repo.setReferencePrice(cmd.idVariante, cmd.precioReferencia, cmd.idAdmin);
  }
}

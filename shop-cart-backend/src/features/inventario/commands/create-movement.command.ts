import { ICommandHandler } from '@/core/cqrs/index';
import { IInventoryRepository } from '../abstracts/inventario.repository.interface';
import { InventoryMovementPolicy } from '../domain/movement.policy';
import {
  CreateMovementCommand,
  CreateMovementResult,
  MovementTypeInput,
} from '../models/inventario.schema';
import { InventoryRepository } from '../repository/inventario.repository';

export class CreateMovementCommandHandler implements ICommandHandler<CreateMovementCommand, CreateMovementResult> {
  constructor(private readonly repo: IInventoryRepository = new InventoryRepository()) {}

  async handle(cmd: CreateMovementCommand): Promise<CreateMovementResult> {
    const normalizado = InventoryMovementPolicy.validateAndNormalize(
      cmd.tipoMovimiento as MovementTypeInput,
      cmd.cantidad
    );

    return this.repo.createMovement({
      idVariante: cmd.idVariante,
      tipoMovimiento: normalizado.tipoMovimiento,
      cantidad: normalizado.cantidad,
      motivo: cmd.motivo,
      idUsuario: cmd.idUsuario,
      idUsuarioOperador: cmd.idUsuarioOperador ?? cmd.idUsuario,
      costoUnitario: cmd.costoUnitario,
    });
  }
}

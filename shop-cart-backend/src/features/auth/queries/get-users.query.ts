import { IQueryHandler } from '@/core/cqrs/index';
import { AuthRepository } from '../repository/auth.repository';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import { PaginatedUsersResult } from '../models/auth.model';
import { GetUsersDTO } from '../models/auth.schema';

export class GetUsersQueryHandler implements IQueryHandler<GetUsersDTO, PaginatedUsersResult> {
  constructor(private readonly repo: IAuthRepository = new AuthRepository()) {}

  async handle(params: GetUsersDTO): Promise<PaginatedUsersResult> {
    return this.repo.getUsers(params);
  }
}

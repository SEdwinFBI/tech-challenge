import { IQueryHandler } from '@/core/cqrs/index';
import { AuthRepository } from '../repository/auth.repository';
import { IAuthRepository } from '../abstracts/auth.repository.interface';
import { UserProfileDTO } from '../models/auth.model';
import { GetProfileQuery } from '../models/auth.schema';

export class GetProfileQueryHandler implements IQueryHandler<GetProfileQuery, UserProfileDTO | undefined> {
  constructor(private readonly repo: IAuthRepository = new AuthRepository()) {}

  async handle(idUsuario: GetProfileQuery): Promise<UserProfileDTO | undefined> {
    return this.repo.getById(idUsuario);
  }
}

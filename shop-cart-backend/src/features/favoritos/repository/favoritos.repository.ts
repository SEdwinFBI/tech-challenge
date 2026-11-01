import { getDbPool, sql } from '@/core/config/db';
import { IFavoritesRepository } from '../abstracts/favoritos.repository.interface';
import { FavoriteIdDTO, FavoriteProductDTO } from '../models/favoritos.model';

export class FavoritesRepository implements IFavoritesRepository {
  async list(idUsuario: number): Promise<FavoriteProductDTO[]> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .execute<FavoriteProductDTO>('SP_Favoritos_Listar');
    return res.recordset;
  }

  async listIds(idUsuario: number): Promise<FavoriteIdDTO[]> {
    const pool = await getDbPool();
    const res = await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .execute<FavoriteIdDTO>('SP_Favoritos_ListarIDs');
    return res.recordset;
  }

  async add(idUsuario: number, idProducto: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('IDProducto', sql.Int, idProducto)
      .execute('SP_Favoritos_Agregar');
  }

  async remove(idUsuario: number, idProducto: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDUsuario', sql.Int, idUsuario)
      .input('IDProducto', sql.Int, idProducto)
      .execute('SP_Favoritos_Quitar');
  }
}

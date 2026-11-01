import { Router } from 'express';
import { requireAuth, requireRoles } from '@/core/middlewares/auth.middleware';
import { requireNumericId } from '@/core/middlewares/validate-param.middleware';
import { GetFavoritesQueryHandler } from './queries/get-favorites.query';
import { GetFavoriteIdsQueryHandler } from './queries/get-favorite-ids.query';
import { AddFavoriteCommandHandler } from './commands/add-favorite.command';
import { RemoveFavoriteCommandHandler } from './commands/remove-favorite.command';
import { AddFavoriteSchema } from './models/favoritos.schema';

export const favoritosRouter = Router();

const getFavoritesQueryHandler = new GetFavoritesQueryHandler();
const getFavoriteIdsQueryHandler = new GetFavoriteIdsQueryHandler();
const addFavoriteCommandHandler = new AddFavoriteCommandHandler();
const removeFavoriteCommandHandler = new RemoveFavoriteCommandHandler();

favoritosRouter.use(requireAuth, requireRoles('CLIENTE'));

favoritosRouter.get('/', async (req, res, next) => {
  try {
    const datos = await getFavoritesQueryHandler.handle({ idUsuario: req.user!.idUsuario });
    res.json({ ok: true, datos });
  } catch (err) {
    next(err);
  }
});

favoritosRouter.get('/ids', async (req, res, next) => {
  try {
    const datos = await getFavoriteIdsQueryHandler.handle({ idUsuario: req.user!.idUsuario });
    res.json({ ok: true, datos });
  } catch (err) {
    next(err);
  }
});

favoritosRouter.post('/', async (req, res, next) => {
  try {
    const { idProducto } = AddFavoriteSchema.parse(req.body);
    await addFavoriteCommandHandler.handle({ idUsuario: req.user!.idUsuario, idProducto });
    res.status(201).json({ ok: true, mensaje: 'Producto agregado a favoritos.' });
  } catch (err) {
    next(err);
  }
});

favoritosRouter.delete('/:id', requireNumericId, async (req, res, next) => {
  try {
    await removeFavoriteCommandHandler.handle({
      idUsuario: req.user!.idUsuario,
      idProducto: Number(req.params.id),
    });
    res.json({ ok: true, mensaje: 'Producto eliminado de favoritos.' });
  } catch (err) {
    next(err);
  }
});

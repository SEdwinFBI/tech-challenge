import { Router } from 'express';
import { ReviewCatalogProductSchema } from './models/catalog-review.schema';
import { reviewCatalog } from './catalog-review.dependencies';
import { recommendationRateLimiter } from '@/core/middlewares/rate-limit.middleware';
import { optionalAuthLenient, requireAuth, requireRoles } from '@/core/middlewares/auth.middleware';
import { requireNumericId } from '@/core/middlewares/validate-param.middleware';
import { GetCategoriesQueryHandler } from './queries/get-categories.query';
import { GetProductsQueryHandler } from './queries/get-products.query';
import { GetProductByIdQueryHandler } from './queries/get-product-by-id.query';
import { SaveCategoryCommandHandler } from './commands/save-category.command';
import { CreateProductCommandHandler } from './commands/create-product.command';
import { UpdateProductCommandHandler } from './commands/update-product.command';
import { DeleteProductCommandHandler } from './commands/delete-product.command';
import { CreateVariantCommandHandler } from './commands/create-variant.command';
import { UpdateVariantCommandHandler } from './commands/update-variant.command';
import { UpdatePriceCommandHandler } from './commands/update-price.command';
import { CreateImageUploadUrlCommandHandler } from './commands/create-image-upload-url.command';
import { AddProductImageCommandHandler } from './commands/add-product-image.command';
import { DeleteProductImageCommandHandler } from './commands/delete-product-image.command';
import { SetReferencePriceCommandHandler } from './commands/set-reference-price.command';
import { SetFeaturedCommandHandler } from './commands/set-featured.command';
import { GetProductImagesQueryHandler } from './queries/get-product-images.query';
import { SetCategoryImageCommandHandler } from './commands/set-category-image.command';
import { GetProductAdminQueryHandler } from './queries/get-product-admin.query';
import { GetProductInventoryQueryHandler } from './queries/get-product-inventory.query';
import {
  CreateProductSchema,
  CreateVariantSchema,
  GetProductsSchema,
  SaveCategorySchema,
  UpdatePriceSchema,
  UpdateProductSchema,
  UpdateVariantSchema,
  AddProductImageSchema,
  CreateImageUploadUrlSchema,
  SetFeaturedSchema,
  SetReferencePriceSchema,
  SetCategoryImageSchema,
} from './models/catalogo.schema';

export const catalogoRouter = Router();

catalogoRouter.post('/revision', requireAuth, requireRoles('ADMINISTRADOR'), recommendationRateLimiter, async (req, res, next) => {
  try {
    const result = await reviewCatalog.handle(ReviewCatalogProductSchema.parse(req.body));
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

const getCategoriesQueryHandler = new GetCategoriesQueryHandler();
const getProductsQueryHandler = new GetProductsQueryHandler();
const getProductByIdQueryHandler = new GetProductByIdQueryHandler();
const saveCategoryCommandHandler = new SaveCategoryCommandHandler();
const createProductCommandHandler = new CreateProductCommandHandler();
const updateProductCommandHandler = new UpdateProductCommandHandler();
const deleteProductCommandHandler = new DeleteProductCommandHandler();
const createVariantCommandHandler = new CreateVariantCommandHandler();
const updateVariantCommandHandler = new UpdateVariantCommandHandler();
const updatePriceCommandHandler = new UpdatePriceCommandHandler();

catalogoRouter.get('/categorias', optionalAuthLenient, async (req, res, next) => {
  try {
    const soloActivas = req.user?.rol !== 'ADMINISTRADOR';
    const datos = await getCategoriesQueryHandler.handle(soloActivas);
    res.json({ ok: true, datos });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.get('/productos', optionalAuthLenient, async (req, res, next) => {
  try {
    const query = GetProductsSchema.parse(req.query);
    const resultado = await getProductsQueryHandler.handle({
      ...query,
      rolUsuario: req.user?.rol,
    });
    res.json({ ok: true, ...resultado, pagina: query.pagina, tamanoPagina: query.tamanoPagina });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.get('/productos/:id', requireNumericId, async (req, res, next) => {
  try {
    const detalle = await getProductByIdQueryHandler.handle(Number(req.params.id));
    res.json({ ok: true, ...detalle });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.post('/categorias', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const body = SaveCategorySchema.parse(req.body);
    const data = await saveCategoryCommandHandler.handle({ ...body, idAdmin: req.user!.idUsuario });
    res.status(201).json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.put('/categorias/:id', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const body = SaveCategorySchema.parse(req.body);
    const data = await saveCategoryCommandHandler.handle({
      ...body,
      idCategoria: Number(req.params.id),
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.post('/productos', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const body = CreateProductSchema.parse(req.body);
    const data = await createProductCommandHandler.handle({
      ...body,
      idAdmin: req.user!.idUsuario,
    });
    res.status(201).json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.put('/productos/:id', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const body = UpdateProductSchema.parse(req.body);
    const data = await updateProductCommandHandler.handle({
      idProducto: Number(req.params.id),
      ...body,
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, datos: data });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.patch('/productos/:id', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const body = UpdateProductSchema.parse(req.body);
    const data = await updateProductCommandHandler.handle({
      idProducto: Number(req.params.id),
      ...body,
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, datos: data });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.delete('/productos/:id', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const data = await deleteProductCommandHandler.handle({
      idProducto: Number(req.params.id),
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.post('/productos/:id/variantes', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const body = CreateVariantSchema.parse(req.body);
    const data = await createVariantCommandHandler.handle({
      idProducto: Number(req.params.id),
      ...body,
      idAdmin: req.user!.idUsuario,
    });
    res.status(201).json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.put('/variantes/:id', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const body = UpdateVariantSchema.parse(req.body);
    const data = await updateVariantCommandHandler.handle({
      idVariante: Number(req.params.id),
      ...body,
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, datos: data });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.patch('/variantes/:id', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const body = UpdateVariantSchema.parse(req.body);
    const data = await updateVariantCommandHandler.handle({
      idVariante: Number(req.params.id),
      ...body,
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, datos: data });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.patch('/variantes/:id/precio', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const { nuevoPrecio } = UpdatePriceSchema.parse(req.body);
    await updatePriceCommandHandler.handle({
      idVariante: Number(req.params.id),
      nuevoPrecio,
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, mensaje: 'Precio actualizado sin afectar pedidos históricos.' });
  } catch (err) {
    next(err);
  }
});

const getProductImagesQueryHandler = new GetProductImagesQueryHandler();
const addProductImageCommandHandler = new AddProductImageCommandHandler();
const deleteProductImageCommandHandler = new DeleteProductImageCommandHandler();
const createImageUploadUrlCommandHandler = new CreateImageUploadUrlCommandHandler();
const setReferencePriceCommandHandler = new SetReferencePriceCommandHandler();
const setFeaturedCommandHandler = new SetFeaturedCommandHandler();

catalogoRouter.get('/productos/:id/imagenes', requireNumericId, async (req, res, next) => {
  try {
    const datos = await getProductImagesQueryHandler.handle(Number(req.params.id));
    res.json({ ok: true, datos });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.post(
  '/productos/:id/imagenes',
  requireAuth,
  requireRoles('ADMINISTRADOR'),
  requireNumericId,
  async (req, res, next) => {
    try {
      const { url } = AddProductImageSchema.parse(req.body);
      const imagen = await addProductImageCommandHandler.handle({
        idProducto: Number(req.params.id),
        url,
        idAdmin: req.user!.idUsuario,
      });
      res.status(201).json({ ok: true, datos: imagen });
    } catch (err) {
      next(err);
    }
  },
);

catalogoRouter.post(
  '/productos/:id/imagenes/firma',
  requireAuth,
  requireRoles('ADMINISTRADOR'),
  requireNumericId,
  async (req, res, next) => {
    try {
      const dto = CreateImageUploadUrlSchema.parse(req.body);
      const datos = await createImageUploadUrlCommandHandler.handle({ ...dto, idProducto: Number(req.params.id) });
      res.json({ ok: true, datos });
    } catch (err) {
      next(err);
    }
  },
);

catalogoRouter.delete('/imagenes/:id', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    await deleteProductImageCommandHandler.handle({
      idProductoImagen: Number(req.params.id),
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, mensaje: 'Imagen eliminada de la galería.' });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.patch(
  '/variantes/:id/precio-referencia',
  requireAuth,
  requireRoles('ADMINISTRADOR'),
  requireNumericId,
  async (req, res, next) => {
    try {
      const { precioReferencia } = SetReferencePriceSchema.parse(req.body);
      await setReferencePriceCommandHandler.handle({
        idVariante: Number(req.params.id),
        precioReferencia,
        idAdmin: req.user!.idUsuario,
      });
      res.json({ ok: true, mensaje: 'Precio de referencia actualizado. El precio de cobro no cambió.' });
    } catch (err) {
      next(err);
    }
  },
);

catalogoRouter.patch(
  '/productos/:id/destacado',
  requireAuth,
  requireRoles('ADMINISTRADOR'),
  requireNumericId,
  async (req, res, next) => {
    try {
      const { destacado } = SetFeaturedSchema.parse(req.body);
      await setFeaturedCommandHandler.handle({
        idProducto: Number(req.params.id),
        destacado,
        idAdmin: req.user!.idUsuario,
      });
      res.json({ ok: true, mensaje: destacado ? 'Producto destacado.' : 'Producto quitado de destacados.' });
    } catch (err) {
      next(err);
    }
  },
);

const setCategoryImageCommandHandler = new SetCategoryImageCommandHandler();

catalogoRouter.patch(
  '/categorias/:id/imagen',
  requireAuth,
  requireRoles('ADMINISTRADOR'),
  requireNumericId,
  async (req, res, next) => {
    try {
      const { imagenUrl } = SetCategoryImageSchema.parse(req.body);
      await setCategoryImageCommandHandler.handle({
        idCategoria: Number(req.params.id),
        imagenUrl,
        idAdmin: req.user!.idUsuario,
      });
      res.json({ ok: true, mensaje: 'Imagen de categoría actualizada.' });
    } catch (err) {
      next(err);
    }
  },
);

const getProductAdminQueryHandler = new GetProductAdminQueryHandler();
const getProductInventoryQueryHandler = new GetProductInventoryQueryHandler();

catalogoRouter.get('/productos/:id/inventario', requireAuth, requireRoles('OPERADOR', 'ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const detalle = await getProductInventoryQueryHandler.handle(Number(req.params.id));
    res.json({ ok: true, ...detalle });
  } catch (err) {
    next(err);
  }
});

catalogoRouter.get('/admin/productos/:id', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const detalle = await getProductAdminQueryHandler.handle(Number(req.params.id));
    res.json({ ok: true, ...detalle });
  } catch (err) {
    next(err);
  }
});

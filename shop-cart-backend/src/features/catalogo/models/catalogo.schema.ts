import { z } from 'zod';

export * from './catalogo.model';

export const GetCategoriesSchema = z.object({
  soloActivas: z.boolean().optional(),
});
export type GetCategoriesDTO = z.infer<typeof GetCategoriesSchema>;

export const GetProductsSchema = z.object({
  q: z.string().trim().max(150).optional(),
  idCategoria: z.coerce.number().int().positive().optional(),
  precioMin: z.coerce.number().nonnegative().optional(),
  precioMax: z.coerce.number().positive().optional(),
  soloDisponibles: z.string().optional(),
  soloOfertas: z.string().optional(),
  soloNuevos: z.string().optional(),
  soloDestacados: z.string().optional(),
  activo: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  orden: z.enum(['RECIENTES', 'PRECIO_ASC', 'PRECIO_DESC', 'NOMBRE_ASC', 'NOMBRE_DESC', 'MAS_VENDIDOS', 'DESTACADOS']).default('RECIENTES'),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanoPagina: z.coerce.number().int().min(1).max(50).default(12),
});
export type GetProductsDTO = z.infer<typeof GetProductsSchema>;

export const SaveCategorySchema = z.object({
  idCategoria: z.number().int().positive().optional(),
  nombre: z.string().min(2),
  descripcion: z.string().optional(),
  activa: z.boolean().default(true),
});
export type SaveCategoryDTO = z.infer<typeof SaveCategorySchema>;

export const CreateProductSchema = z.object({
  idCategoria: z.number().int().positive(),
  nombre: z.string().min(3),
  descripcion: z.string().optional(),
  imagenUrl: z.string().url().optional(),
  sku: z.string().min(3),
  talla: z.string().optional(),
  color: z.string().optional(),
  presentacion: z.string().optional(),
  precio: z.number().positive(),
  existenciaInicial: z.number().int().min(0).default(0),
});
export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z
  .object({
    idCategoria: z.number().int().positive().optional(),
    nombre: z.string().min(3).optional(),
    descripcion: z.string().optional(),
    imagenUrl: z.string().url().max(500).optional(),
    imagenClave: z.string().min(1).max(500).optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => !(d.imagenUrl && d.imagenClave), {
    message: 'Envía imagenClave o imagenUrl, no ambos.',
    path: ['imagenClave'],
  });
export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;

export const CreateVariantSchema = z.object({
  sku: z.string().min(3),
  talla: z.string().optional(),
  color: z.string().optional(),
  presentacion: z.string().optional(),
  precio: z.number().positive(),
  existenciaInicial: z.number().int().min(0).default(0),
});
export type CreateVariantDTO = z.infer<typeof CreateVariantSchema>;

export const UpdateVariantSchema = z.object({
  sku: z.string().min(3).optional(),
  talla: z.string().optional(),
  color: z.string().optional(),
  presentacion: z.string().optional(),
  precio: z.number().positive().optional(),
  activo: z.boolean().optional(),
});
export type UpdateVariantDTO = z.infer<typeof UpdateVariantSchema>;

export const UpdatePriceSchema = z.object({
  nuevoPrecio: z.number().positive(),
});
export type UpdatePriceDTO = z.infer<typeof UpdatePriceSchema>;

export type SaveCategoryCommand = SaveCategoryDTO & { idAdmin: number };

export type CreateProductCommand = CreateProductDTO & { idAdmin: number };

export type UpdateProductCommand = UpdateProductDTO & { idProducto: number; idAdmin: number };

export interface DeleteProductCommand {
  idProducto: number;
  idAdmin: number;
}

export type CreateVariantCommand = CreateVariantDTO & { idProducto: number; idAdmin: number };

export type UpdateVariantCommand = UpdateVariantDTO & {
  idVariante: number;
  idAdmin: number;
};

export interface UpdatePriceCommand {
  idVariante: number;
  nuevoPrecio: number;
  idAdmin: number;
}

export type GetProductsQuery = GetProductsDTO & {
  rolUsuario?: string;
};

export const AddProductImageSchema = z
  .object({
    clave: z.string().min(1).max(500).optional(),
    url: z
      .string()
      .url()
      .max(500)
      .refine(u => /^https?:\/\//i.test(u), { message: 'La URL debe iniciar con http:// o https://' })
      .optional(),
  })
  .refine((d) => Boolean(d.clave) !== Boolean(d.url), {
    message: 'Envía exactamente uno de clave o url.',
    path: ['clave'],
  });
export type AddProductImageDTO = z.infer<typeof AddProductImageSchema>;

export const SetReferencePriceSchema = z.object({
  precioReferencia: z.number().positive().nullable(),
});
export type SetReferencePriceDTO = z.infer<typeof SetReferencePriceSchema>;

export const SetFeaturedSchema = z.object({
  destacado: z.boolean(),
});
export type SetFeaturedDTO = z.infer<typeof SetFeaturedSchema>;

export interface AddProductImageCommand {
  idProducto: number;
  clave?: string;
  url?: string;
  idAdmin: number;
}

export interface DeleteProductImageCommand {
  idProductoImagen: number;
  idAdmin: number;
}

export interface SetReferencePriceCommand {
  idVariante: number;
  precioReferencia: number | null;
  idAdmin: number;
}

export interface SetFeaturedCommand {
  idProducto: number;
  destacado: boolean;
  idAdmin: number;
}

export const SetCategoryImageSchema = z.object({
  imagenUrl: z
    .string()
    .url()
    .max(500)
    .refine(u => /^https?:\/\//i.test(u), { message: 'La URL debe iniciar con http:// o https://' })
    .nullable(),
});
export type SetCategoryImageDTO = z.infer<typeof SetCategoryImageSchema>;

export interface SetCategoryImageCommand {
  idCategoria: number;
  imagenUrl: string | null;
  idAdmin: number;
}

export const CreateImageUploadUrlSchema = z.object({
  contentType: z.enum(['image/webp', 'image/jpeg', 'image/png']),
  tamanoBytes: z.number().int().min(1).max(2_097_152),
});
export type CreateImageUploadUrlDTO = z.infer<typeof CreateImageUploadUrlSchema>;

export type CreateImageUploadUrlCommand = CreateImageUploadUrlDTO & {
  idProducto: number;
};

export const ReviewCatalogProductSchema = z.object({
  nombre: z.string().trim().min(3).max(150),
  descripcion: z.string().trim().max(1000).optional(),
  idProducto: z.number().int().positive().optional(),
});
export type ReviewCatalogProductDTO = z.infer<typeof ReviewCatalogProductSchema>;

export type ReviewCatalogProductQuery = ReviewCatalogProductDTO;

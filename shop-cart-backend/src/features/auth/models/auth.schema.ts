import { z } from 'zod';
import { DireccionSchema } from '@/core/domain/sort';
import { UserRole } from './auth.model';

export * from './auth.model';

export const RegisterSchema = z.object({
  correo: z.email(),
  password: z.string().min(8).max(72),
  nombreCompleto: z.string().min(3),
  tokenInvitado: z.string().optional(),
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  correo: z.email(),
  password: z.string().min(1),
  tokenInvitado: z.string().optional(),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

export const RotateTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RotateTokenDTO = z.infer<typeof RotateTokenSchema>;

export const UpdateUserStatusSchema = z.object({
  activo: z.boolean(),
});

export type UpdateUserStatusDTO = z.infer<typeof UpdateUserStatusSchema>;

export const UpdateUserRoleSchema = z.object({
  rol: z.enum(['CLIENTE', 'OPERADOR', 'ADMINISTRADOR']),
});

export type UpdateUserRoleDTO = z.infer<typeof UpdateUserRoleSchema>;

export const GetUsersSchema = z.object({
  q: z.string().trim().max(150).optional(),
  rol: z.enum(['CLIENTE', 'OPERADOR', 'ADMINISTRADOR']).optional(),
  activo: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
  orden: z.enum(['fecha', 'nombre', 'correo', 'rol']).default('fecha'),
  direccion: DireccionSchema,
  pagina: z.coerce.number().int().min(1).default(1),
  tamanoPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetUsersDTO = z.infer<typeof GetUsersSchema>;

export type RegisterCommand = RegisterDTO;
export type LoginCommand = LoginDTO;
export type RotateTokenCommand = string;

export interface UpdateUserRoleCommand {
  idUsuario: number;
  nuevoRol: UserRole | string;
  idAdmin: number;
}

export interface UpdateUserStatusCommand {
  idUsuarioObjetivo: number;
  activo: boolean;
  idAdmin: number;
}

export type GetProfileQuery = number;
export type GetUsersQuery = GetUsersDTO;

export const UpdateProfileSchema = z.object({
  nombreCompleto: z.string().trim().min(3).max(150),
});
export type UpdateProfileDTO = z.infer<typeof UpdateProfileSchema>;

export const ChangePasswordSchema = z
  .object({
    passwordActual: z.string().min(1),
    passwordNueva: z.string().min(8).max(72),
  })
  .refine(d => d.passwordActual !== d.passwordNueva, {
    path: ['passwordNueva'],
    message: 'La nueva contraseña debe ser distinta a la actual.',
  });
export type ChangePasswordDTO = z.infer<typeof ChangePasswordSchema>;

export interface UpdateProfileCommand {
  idUsuario: number;
  nombreCompleto: string;
}

export interface ChangePasswordCommand {
  idUsuario: number;
  correo: string;
  passwordActual: string;
  passwordNueva: string;
}

import { z } from 'zod';

export const loginSchema = z.object({
  correo: z.string().email('Correo no válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  nombreCompleto: z.string().min(3, 'Mínimo 3 caracteres'),
  correo: z.string().email('Correo no válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

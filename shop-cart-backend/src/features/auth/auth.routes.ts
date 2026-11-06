import { Router } from 'express';
import { RegisterCommandHandler } from './commands/register.command';
import { LoginCommandHandler } from './commands/login.command';
import { RotateTokenCommandHandler } from './commands/rotate-token.command';
import { LogoutCommandHandler } from './commands/logout.command';
import { UpdateUserStatusCommandHandler } from './commands/update-user-status.command';
import { UpdateUserRoleCommandHandler } from './commands/update-user-role.command';
import { UpdateProfileCommandHandler } from './commands/update-profile.command';
import { ChangePasswordCommandHandler } from './commands/change-password.command';
import { GetProfileQueryHandler } from './queries/get-profile.query';
import { GetUsersQueryHandler } from './queries/get-users.query';
import {
  GetUsersSchema,
  LoginSchema,
  RegisterSchema,
  UpdateUserRoleSchema,
  UpdateUserStatusSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
} from './models/auth.schema';
import { authRateLimiter } from '@/core/middlewares/rate-limit.middleware';
import { requireAuth, requireRoles } from '@/core/middlewares/auth.middleware';
import { requireNumericId } from '@/core/middlewares/validate-param.middleware';
import { DomainError } from '@/core/domain/domain.error';
import { setCookie } from './auth.helpers';

export const authRouter = Router();

const registerCommandHandler = new RegisterCommandHandler();
const loginCommandHandler = new LoginCommandHandler();
const rotateTokenCommandHandler = new RotateTokenCommandHandler();
const logoutCommandHandler = new LogoutCommandHandler();
const updateUserStatusCommandHandler = new UpdateUserStatusCommandHandler();
const updateUserRoleCommandHandler = new UpdateUserRoleCommandHandler();
const getProfileQueryHandler = new GetProfileQueryHandler();
const getUsersQueryHandler = new GetUsersQueryHandler();



authRouter.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const dto = RegisterSchema.parse({ ...req.body, tokenInvitado: req.headers['x-guest-token'] });
    const data = await registerCommandHandler.handle(dto);
    setCookie(res, data.refreshToken);
    res.status(201).json({ ok: true, accessToken: data.accessToken, usuario: data.usuario });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const dto = LoginSchema.parse({ ...req.body, tokenInvitado: req.headers['x-guest-token'] });
    const data = await loginCommandHandler.handle(dto);
    setCookie(res, data.refreshToken);
    res.json({ ok: true, accessToken: data.accessToken, usuario: data.usuario });
  } catch (err) {
    next(err);
  }
});

const REFRESH_DEFINITIVE_ERRORS = [50011, 50012, 50013];

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const token: string | undefined = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw new DomainError('Refresh token no encontrado.', 'NO_REFRESH_TOKEN', 401);
    const data = await rotateTokenCommandHandler.handle(token);
    setCookie(res, data.refreshToken);
    res.json({ ok: true, accessToken: data.accessToken, usuario: data.usuario });
  } catch (err) {
    if (err instanceof DomainError || REFRESH_DEFINITIVE_ERRORS.includes((err as { number?: number })?.number ?? 0)) {
      res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    }
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token: string | undefined = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      await logoutCommandHandler.handle(token);
    }
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.json({ ok: true, mensaje: 'Sesión finalizada.' });
  } catch (err) {
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const usuario = await getProfileQueryHandler.handle(req.user!.idUsuario);
    if (!usuario) throw new DomainError('Usuario no encontrado.', 'USER_NOT_FOUND', 404);
    res.json({ ok: true, usuario });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/usuarios', requireAuth, requireRoles('ADMINISTRADOR'), async (req, res, next) => {
  try {
    const query = GetUsersSchema.parse(req.query);
    const resultado = await getUsersQueryHandler.handle(query);
    res.json({
      ok: true,
      datos: resultado.items,
      total: resultado.totalRegistros,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.patch('/usuarios/:id/rol', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const { rol } = UpdateUserRoleSchema.parse(req.body);
    await updateUserRoleCommandHandler.handle({
      idUsuario: Number(req.params.id),
      nuevoRol: rol,
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, mensaje: 'Rol actualizado.' });
  } catch (err) {
    next(err);
  }
});

authRouter.patch('/usuarios/:id/estado', requireAuth, requireRoles('ADMINISTRADOR'), requireNumericId, async (req, res, next) => {
  try {
    const { activo } = UpdateUserStatusSchema.parse(req.body);
    await updateUserStatusCommandHandler.handle({
      idUsuarioObjetivo: Number(req.params.id),
      activo,
      idAdmin: req.user!.idUsuario,
    });
    res.json({ ok: true, mensaje: 'Estado actualizado.' });
  } catch (err) {
    next(err);
  }
});

const updateProfileCommandHandler = new UpdateProfileCommandHandler();
const changePasswordCommandHandler = new ChangePasswordCommandHandler();

authRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { nombreCompleto } = UpdateProfileSchema.parse(req.body);
    const usuario = await updateProfileCommandHandler.handle({
      idUsuario: req.user!.idUsuario,
      nombreCompleto,
    });
    res.json({ ok: true, usuario });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/me/password', authRateLimiter, requireAuth, async (req, res, next) => {
  try {
    const { passwordActual, passwordNueva } = ChangePasswordSchema.parse(req.body);
    await changePasswordCommandHandler.handle({
      idUsuario: req.user!.idUsuario,
      correo: req.user!.correo,
      passwordActual,
      passwordNueva,
    });
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.json({ ok: true, mensaje: 'Contraseña actualizada. Inicia sesión de nuevo.' });
  } catch (err) {
    next(err);
  }
});

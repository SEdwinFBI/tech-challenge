import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, type LoginFormData } from '../schemas/authSchemas';
import { AuthShell, authInput } from '../components/AuthShell';
import { toast } from '@/shared/ui/toastStore';
import { apiErrorMessage } from '@/shared/lib/apiErrors';

const DEMO = [
  { label: 'Administrador', correo: 'admin@shopcart.gt' },
  { label: 'Operador', correo: 'operador@shopcart.gt' },
  { label: 'Cliente', correo: 'cliente@shopcart.gt' },
];

export const LoginPage: React.FC = () => {
  const { login, trySilentRefresh, hasSessionHint } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), mode: 'onBlur', defaultValues: { correo: '', password: '' } });

  useEffect(() => {
    if (hasSessionHint()) void trySilentRefresh();
  }, [hasSessionHint, trySilentRefresh]);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const user = await login(data.correo, data.password);
      toast.success(`Bienvenido, ${user.nombreCompleto}`);
      if (user.rol === 'ADMINISTRADOR') {
        navigate(from.startsWith('/admin') ? from : '/admin/dashboard', { replace: true });
      } else if (user.rol === 'OPERADOR') {
        navigate(from.startsWith('/admin') ? from : '/admin/pedidos', { replace: true });
      } else {
        navigate(from.startsWith('/admin') ? '/' : from, { replace: true });
      }
    } catch (err: unknown) {
      const msg =
        apiErrorMessage(err, 'Correo o contraseña incorrectos.');
      setServerError(msg);
    }
  };

  const border = (bad: boolean) => (bad ? 'border-rose-400' : 'border-slate-300');

  return (
    <AuthShell
      title="Inicia sesión"
      subtitle="Revisa tus pedidos y sigue comprando."
      footer={<>¿Aún no tienes cuenta? <Link to="/registro" className="font-extrabold text-brand hover:underline">Crear cuenta</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {serverError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Correo electrónico</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            aria-invalid={Boolean(errors.correo)}
            className={`${authInput} ${border(Boolean(errors.correo))}`}
            {...register('correo')}
          />
          {errors.correo && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{errors.correo.message}</p>}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Contraseña</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Contraseña"
              aria-invalid={Boolean(errors.password)}
              className={`${authInput} pr-12 ${border(Boolean(errors.password))}`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-brand"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{errors.password.message}</p>}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta text-sm font-extrabold text-cta-fg shadow-lift transition hover:bg-cta-hover active:scale-[0.99] disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Ingresar
        </button>

        {import.meta.env.DEV && (
          <details className="rounded-xl border border-dashed border-brand/30 bg-brand-soft/60 p-3 text-xs text-slate-600">
            <summary className="cursor-pointer font-bold text-slate-700">Cuentas de prueba (solo desarrollo)</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO.map(d => (
                <button
                  key={d.correo}
                  type="button"
                  onClick={() => {
                    setValue('correo', d.correo, { shouldValidate: true });
                    setValue('password', 'Admin123!', { shouldValidate: true });
                  }}
                  className="rounded-full bg-white px-3 py-1.5 font-bold text-brand-deep ring-1 ring-brand/20 transition hover:bg-brand hover:text-white"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </details>
        )}
      </form>
    </AuthShell>
  );
};

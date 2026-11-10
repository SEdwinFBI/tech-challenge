import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { registerSchema, type RegisterFormData } from '../schemas/authSchemas';
import { AuthShell, authInput } from '../components/AuthShell';
import { toast } from '@/shared/ui/toastStore';
import { apiErrorMessage, apiFieldErrors } from '@/shared/lib/apiErrors';

export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
  return { score, label: ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'][score] };
}

const BAR = ['bg-slate-200', 'bg-rose-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'];

export const RegisterPage: React.FC = () => {
  const registerUser = useAuth(s => s.register);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { nombreCompleto: '', correo: '', password: '' },
  });

  const pw = watch('password');
  const strength = useMemo(() => passwordStrength(pw ?? ''), [pw]);

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser(data.correo, data.password, data.nombreCompleto);
      toast.success('Cuenta creada');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const campos = apiFieldErrors(err).filter(c => c.campo in data);
      campos.forEach(c => setError(c.campo as keyof RegisterFormData, { type: 'server', message: c.mensaje }));
      if (campos.length === 0) setServerError(apiErrorMessage(err, 'No se pudo crear la cuenta. Revisa el correo.'));
    }
  };

  const border = (bad: boolean) => (bad ? 'border-rose-400' : 'border-slate-300');

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Compra en minutos, con precios en quetzales."
      footer={<>¿Ya tienes cuenta? <Link to="/login" className="font-extrabold text-brand hover:underline">Ingresar</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {serverError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Nombre completo</span>
          <input
            autoComplete="name"
            placeholder="María López"
            aria-invalid={Boolean(errors.nombreCompleto)}
            className={`${authInput} ${border(Boolean(errors.nombreCompleto))}`}
            {...register('nombreCompleto')}
          />
          {errors.nombreCompleto && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{errors.nombreCompleto.message}</p>}
        </label>

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

        <div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Contraseña</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
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
          </label>
          {errors.password && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{errors.password.message}</p>}
          {pw && (
            <div className="mt-2" aria-live="polite">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${strength.score >= i ? BAR[strength.score] : 'bg-slate-200'}`} />)}
              </div>
              <p className="mt-1 text-xs text-slate-500">Seguridad: <strong>{strength.label}</strong></p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta text-sm font-extrabold text-cta-fg shadow-lift transition hover:bg-cta-hover active:scale-[0.99] disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Crear cuenta
        </button>
      </form>
    </AuthShell>
  );
};

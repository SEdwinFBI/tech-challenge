import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authApi } from '@/features/auth/api/authApi';
import { setAccessToken } from '@/shared/lib/apiClient';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { toast } from '@/shared/ui/toastStore';

const profileSchema = z.object({
  nombreCompleto: z.string().trim().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres'),
});

const passwordSchema = z
  .object({
    passwordActual: z.string().min(1, 'Ingresa tu contraseña actual'),
    passwordNueva: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
    confirmar: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine(d => d.passwordNueva === d.confirmar, { path: ['confirmar'], message: 'Las contraseñas no coinciden' })
  .refine(d => d.passwordActual !== d.passwordNueva, { path: ['passwordNueva'], message: 'Debe ser distinta a la actual' });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const input =
  'h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100 disabled:text-slate-500';

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span>
    {children}
    {error && <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{error}</p>}
  </label>
);

export const ProfilePage: React.FC = () => {
  const user = useAuth(s => s.user);
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);

  const profile = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nombreCompleto: user?.nombreCompleto ?? '' },
  });
  const pw = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema), defaultValues: { passwordActual: '', passwordNueva: '', confirmar: '' } });

  const strength = useMemo(() => {
    const v = pw.watch('passwordNueva') ?? '';
    let s = 0;
    if (v.length >= 8) s++;
    if (v.length >= 12) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
    if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
    return { score: s, has: v.length > 0 };
  }, [pw.watch('passwordNueva')]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async (data: ProfileForm) => {
    try {
      const updated = await authApi.updateProfile(data.nombreCompleto);
      useAuth.setState(s => (s.user ? { user: { ...s.user, nombreCompleto: updated.nombreCompleto } } : s));
      toast.success('Perfil actualizado');
      profile.reset({ nombreCompleto: updated.nombreCompleto });
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, '');
      toast.error('No se pudo actualizar tu perfil', msg);
    }
  };

  const changePassword = async (data: PasswordForm) => {
    try {
      await authApi.changePassword(data.passwordActual, data.passwordNueva);
      setAccessToken(null);
      useAuth.getState().endLocalSession();
      toast.success('Contraseña actualizada', 'Ingresa de nuevo.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { codigo?: string; mensaje?: string } } })?.response;
      if (res?.data?.codigo === 'INVALID_CURRENT_PASSWORD') {
        pw.setError('passwordActual', { message: apiErrorMessage(err) });
      } else {
        toast.error('No se pudo cambiar la contraseña', apiErrorMessage(err, ''));
      }
    }
  };

  if (!user) return null;
  const bars = ['bg-slate-200', 'bg-rose-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'];

  return (
    <div className="max-w-2xl animate-fade-up space-y-10">
      <section aria-labelledby="h-perfil">
        <h1 id="h-perfil" className="text-2xl font-extrabold tracking-tight text-slate-900">Mi perfil</h1>
        <form onSubmit={profile.handleSubmit(saveProfile)} noValidate className="space-y-4 rounded-2xl border border-slate-200 p-5 sm:p-6">
          <Field label="Nombre completo" error={profile.formState.errors.nombreCompleto?.message}>
            <input className={`${input} ${profile.formState.errors.nombreCompleto ? 'border-rose-400' : 'border-slate-300'}`} autoComplete="name" {...profile.register('nombreCompleto')} />
          </Field>
          <Field label="Correo electrónico">
            <input className={`${input} border-slate-300`} value={user.correo} disabled readOnly />
            <span className="mt-1 block text-xs text-slate-400">No se puede cambiar.</span>
          </Field>
          <button
            type="submit"
            disabled={!profile.formState.isDirty || profile.formState.isSubmitting}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-cta px-6 text-sm font-extrabold text-cta-fg hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {profile.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </form>
      </section>

      <section aria-labelledby="h-pass">
        <h2 id="h-pass" className="text-xl font-extrabold tracking-tight text-slate-900">Contraseña</h2>
        <p className="mb-5 text-sm text-slate-500">Cierra tus sesiones en todos los dispositivos.</p>
        <form onSubmit={pw.handleSubmit(changePassword)} noValidate className="space-y-4 rounded-2xl border border-slate-200 p-5 sm:p-6">
          <Field label="Contraseña actual" error={pw.formState.errors.passwordActual?.message}>
            <input type={showPw ? 'text' : 'password'} autoComplete="current-password" className={`${input} ${pw.formState.errors.passwordActual ? 'border-rose-400' : 'border-slate-300'}`} {...pw.register('passwordActual')} />
          </Field>
          <Field label="Nueva contraseña" error={pw.formState.errors.passwordNueva?.message}>
            <input type={showPw ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className={`${input} ${pw.formState.errors.passwordNueva ? 'border-rose-400' : 'border-slate-300'}`} {...pw.register('passwordNueva')} />
          </Field>
          {strength.has && (
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map(i => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${strength.score >= i ? bars[strength.score] : 'bg-slate-200'}`} />)}
            </div>
          )}
          <Field label="Confirmar nueva contraseña" error={pw.formState.errors.confirmar?.message}>
            <input type={showPw ? 'text' : 'password'} autoComplete="new-password" className={`${input} ${pw.formState.errors.confirmar ? 'border-rose-400' : 'border-slate-300'}`} {...pw.register('confirmar')} />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setShowPw(s => !s)} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {showPw ? 'Ocultar' : 'Mostrar'} contraseñas
            </button>
            <button
              type="submit"
              disabled={pw.formState.isSubmitting}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {pw.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Cambiar contraseña
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

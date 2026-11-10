import { iniciarTareasProgramadas } from '@/core/jobs/scheduler';
import { ReconcilePaymentsCommandHandler } from '@/features/checkout/commands/reconcile-payments.command';
import { PurgeViewsCommandHandler } from '@/features/recomendaciones/commands/purge-views.command';

export function registrarTareasProgramadas(): void {
  const purgeViews = new PurgeViewsCommandHandler();
  const reconcilePayments = new ReconcilePaymentsCommandHandler();
  iniciarTareasProgramadas({
    purgarVistas: () => purgeViews.handle(),
    conciliarPagos: () => reconcilePayments.handle(),
  });
}

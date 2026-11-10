import cron from 'node-cron';
import { getDbPool } from '@/core/config/db';
import { ejecutarConLock } from '@/core/jobs/redis-lock';

const INTERVALO_LOCK_MS = 55_000;

export interface TareasProgramadas {
  purgarVistas: () => Promise<unknown>;
  conciliarPagos: () => Promise<unknown>;
}

export function iniciarTareasProgramadas(tareas: TareasProgramadas): void {
  cron.schedule('* * * * *', async () => {
    try {
      await ejecutarConLock('limpiar-reservas', INTERVALO_LOCK_MS, async () => {
        const pool = await getDbPool();
        await pool.request().execute('SP_Inventario_LimpiarReservasVencidas');
      });
    } catch (err) {
      console.error('Error al limpiar reservas vencidas:', err);
    }
  });

  cron.schedule('17 3 * * *', async () => {
    try {
      await ejecutarConLock('purgar-vistas', 3_600_000, async () => {
        await tareas.purgarVistas();
      });
    } catch (err) {
      console.error('Error al purgar vistas de recomendaciones:', err);
    }
  });

  let conciliando = false;
  setInterval(async () => {
    if (conciliando) return;
    conciliando = true;
    try {
      await ejecutarConLock('conciliar-pagos', INTERVALO_LOCK_MS, async () => {
        await tareas.conciliarPagos();
      });
    } catch (err) {
      console.error('Error al conciliar pagos:', err);
    } finally {
      conciliando = false;
    }
  }, 60_000).unref();
}

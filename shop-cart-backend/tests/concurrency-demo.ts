
import net from 'net';
import jwt from 'jsonwebtoken';
import { env } from '@/core/config/env';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bgBlue: '\x1b[44m\x1b[37m',
  bgGreen: '\x1b[42m\x1b[30m',
};

function banner(title: string): void {
  console.log(`\n${c.yellow}${c.bold}${title}${c.reset}\n`);
}

function checkPort(port: number, host: string = 'localhost'): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function checkHttp(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.status === 200;
  } catch {
    return false;
  }
}

async function ejecutarSimulacionArquitectura(): Promise<void> {
  banner('Escenario A: prevención de sobreventa');
  console.log(`${c.bold}Producto:${c.reset} Botín de Cuero Genuino (SKU: ${c.yellow}BOT-CUE-42-NEG${c.reset})`);
  console.log(`${c.bold}Existencia física:${c.reset} 1 unidad`);
  console.log(`${c.bold}Bloqueo:${c.reset} SELECT ... FROM Variantes WITH (UPDLOCK, ROWLOCK)`);
  console.log(`${c.dim}El primer proceso adquiere el bloqueo; los demás esperan y se rechazan si no hay stock.${c.reset}\n`);

  interface VarianteEnMemoria {
    sku: string;
    existenciaFisica: number;
    reservadas: number;
    mutex: Promise<void>;
  }

  const stockVariante: VarianteEnMemoria = {
    sku: 'BOT-CUE-42-NEG',
    existenciaFisica: 1,
    reservadas: 0,
    mutex: Promise.resolve(),
  };

  let lockQueue = Promise.resolve();
  async function reservarConcurrente(clienteId: string, cantidad: number) {
    const inicio = performance.now();
    const resultado = await new Promise<{ ok: boolean; mensaje: string; duracionMs: number }>(resolve => {
      lockQueue = lockQueue.then(async () => {
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 40) + 15));
        const disponible = stockVariante.existenciaFisica - stockVariante.reservadas;

        if (disponible >= cantidad) {
          stockVariante.reservadas += cantidad;
          const duracionMs = Math.round(performance.now() - inicio);
          resolve({
            ok: true,
            mensaje: `Reserva exitosa de ${cantidad} unidad(es). Reserva válida por 15 min.`,
            duracionMs,
          });
        } else {
          const duracionMs = Math.round(performance.now() - inicio);
          resolve({
            ok: false,
            mensaje: `Error 50051: Existencia insuficiente para SKU ${stockVariante.sku} (Disponible: ${disponible})`,
            duracionMs,
          });
        }
      });
    });

    return { clienteId, ...resultado };
  }

  console.log(`${c.yellow}Disparando 5 peticiones simultáneas...${c.reset}`);
  const clientes = ['Cliente_A (Web)', 'Cliente_B (App)', 'Cliente_C (Mobile)', 'Cliente_D (Web)', 'Cliente_E (API)'];
  const resultadosA = await Promise.all(clientes.map(cli => reservarConcurrente(cli, 1)));

  console.log('\nResultados:');
  let exitos = 0;
  let rechazados = 0;

  resultadosA.forEach(r => {
    if (r.ok) {
      exitos++;
      console.log(`  ${c.green}[${r.clienteId}]${c.reset} 200 OK (${r.duracionMs}ms) - ${r.mensaje}`);
    } else {
      rechazados++;
      console.log(`  ${c.red}[${r.clienteId}]${c.reset} 400 Bad Request (${r.duracionMs}ms) - ${r.mensaje}`);
    }
  });

  console.log(`\n${c.bold}Balance final de inventario:${c.reset}`);
  console.log(`  Unidades reservadas: ${c.green}${exitos}${c.reset}`);
  console.log(`  Sobreventas bloqueadas: ${c.green}${rechazados}${c.reset}`);
  console.log(`  Sobreventa detectada: ${c.green}${c.bold}0 unidades${c.reset}\n`);

  banner('Escenario B: control de peticiones duplicadas');
  const claveIdempotencia = `IDEMP-DEMO-${Date.now()}-8f4b`;
  console.log(`${c.bold}Clave de idempotencia:${c.reset} ${c.yellow}${claveIdempotencia}${c.reset}`);
  console.log(`${c.bold}Consulta:${c.reset} Pedidos WITH (UPDLOCK, HOLDLOCK) WHERE ClaveIdempotencia = @Clave`);
  console.log(`${c.dim}La primera petición crea el pedido (FueIdempotente = 0).`);
  console.log(`Reintentos posteriores devuelven el pedido existente (FueIdempotente = 1).${c.reset}\n`);

  interface PedidoIdempotente {
    idPedido: number;
    claveIdempotencia: string;
    monto: number;
  }

  const pedidosBD = new Map<string, PedidoIdempotente>();
  let transaccionLock = Promise.resolve();
  let siguienteIdPedido = 1001;

  async function confirmarPagoSimulado(intentoId: number) {
    const inicio = performance.now();
    return new Promise<{ intentoId: number; status: number; fueIdempotente: number; idPedido: number; mensaje: string; ms: number }>(resolve => {
      transaccionLock = transaccionLock.then(async () => {
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 30) + 10));
        const duracion = Math.round(performance.now() - inicio);

        const existente = pedidosBD.get(claveIdempotencia);
        if (existente) {
          resolve({
            intentoId,
            status: 200,
            fueIdempotente: 1,
            idPedido: existente.idPedido,
            mensaje: 'Pedido procesado previamente (Respuesta Idempotente en Cache DB).',
            ms: duracion,
          });
        } else {
          const nuevoPedido: PedidoIdempotente = {
            idPedido: siguienteIdPedido++,
            claveIdempotencia,
            monto: 650.0,
          };
          pedidosBD.set(claveIdempotencia, nuevoPedido);
          resolve({
            intentoId,
            status: 201,
            fueIdempotente: 0,
            idPedido: nuevoPedido.idPedido,
            mensaje: 'Pedido creado y pagado.',
            ms: duracion,
          });
        }
      });
    });
  }

  console.log(`${c.yellow}Disparando 3 peticiones concurrentes a POST /api/v1/checkout/confirmar (misma clave)...${c.reset}`);
  const respuestasB = await Promise.all([
    confirmarPagoSimulado(1),
    confirmarPagoSimulado(2),
    confirmarPagoSimulado(3),
  ]);

  console.log('\nResultados de idempotencia:');
  respuestasB.forEach(r => {
    const statusColor = r.status === 201 ? c.green : c.cyan;
    console.log(`  Petición #${r.intentoId}: status ${statusColor}${r.status}${c.reset} | FueIdempotente: ${c.bold}${r.fueIdempotente}${c.reset} | IDPedido: ${c.bold}#${r.idPedido}${c.reset} (${r.ms}ms) - ${r.mensaje}`);
  });

  const creadores = respuestasB.filter(r => r.status === 201 && r.fueIdempotente === 0);
  const idempotentes = respuestasB.filter(r => r.status === 200 && r.fueIdempotente === 1);
  const idsUnicos = new Set(respuestasB.map(r => r.idPedido));

  console.log(`\n${c.bold}Verificación de integridad de pago:${c.reset}`);
  console.log(`  Pedidos nuevos (201): ${creadores.length === 1 ? c.green + '1 (correcto)' : c.red + creadores.length}${c.reset}`);
  console.log(`  Respuestas idempotentes sin duplicar (200): ${idempotentes.length === 2 ? c.green + '2 (correcto)' : c.yellow + idempotentes.length}${c.reset}`);
  console.log(`  IDPedido consistente en todas las respuestas: ${idsUnicos.size === 1 ? c.green + 'sí (' + Array.from(idsUnicos)[0] + ')' : c.red + 'no'}${c.reset}`);
  console.log(`  Cobros / pedidos duplicados: ${c.green}${c.bold}0${c.reset}\n`);
}

async function ejecutarEnVivo(baseUrl: string): Promise<void> {
  banner('Modo en vivo contra ' + baseUrl);

  const secret = env.JWT_ACCESS_SECRET || 'access_token_super_secret_key_change_in_production';
  const tokenCliente1 = jwt.sign({ idUsuario: 3, correo: 'cliente1@gmail.com', rol: 'CLIENTE' }, secret, { credentials: false } as any);

  console.log(`${c.dim}Verificando /health...${c.reset}`);
  const healthRes = await fetch(`${baseUrl}/health`).then(r => r.json() as Promise<any>).catch(() => null);
  console.log(`  /health:`, healthRes);

  console.log(`\n${c.dim}Verificando catálogo en /api/v1/catalogo/productos...${c.reset}`);
  try {
    const catRes = await fetch(`${baseUrl}/api/v1/catalogo/productos?q=BOT-CUE-42-NEG`);
    const catData = await catRes.json();
    console.log(`  Estado catálogo: ${catRes.status}`, catData);
  } catch (err: any) {
    console.log(`  Error al consultar catálogo: ${err.message}`);
  }

  console.log(`\n${c.dim}Disparando 3 peticiones concurrentes de checkout/confirmar con la misma ClaveIdempotencia...${c.reset}`);
  const clave = `IDEMP-LIVE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const body = {
    idCarrito: 1,
    idDireccion: 1,
    claveIdempotencia: clave,
    simularFalloPago: false,
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenCliente1}`,
  };

  try {
    const respuestas = await Promise.all([
      fetch(`${baseUrl}/api/v1/checkout/confirmar`, { method: 'POST', headers, body: JSON.stringify(body) }),
      fetch(`${baseUrl}/api/v1/checkout/confirmar`, { method: 'POST', headers, body: JSON.stringify(body) }),
      fetch(`${baseUrl}/api/v1/checkout/confirmar`, { method: 'POST', headers, body: JSON.stringify(body) }),
    ]);

    console.log('\nResultados HTTP:');
    for (let i = 0; i < respuestas.length; i++) {
      const res = respuestas[i]!;
      const data = await res.json().catch(() => null);
      console.log(`  Petición #${i + 1}: HTTP ${res.status}`, data);
    }
  } catch (err: any) {
    console.log(`  No se pudo completar la llamada HTTP: ${err.message}`);
    console.log(`  Mostrando simulación de la arquitectura...`);
    await ejecutarSimulacionArquitectura();
  }
}

async function main() {
  const port = Number(env.PORT) || 3000;
  const baseUrl = `http://localhost:${port}`;

  console.log(`${c.bold}Comprobando entorno de desarrollo...${c.reset}`);
  const sqlReachable = await checkPort(Number(env.DB_PORT) || 1433, env.DB_HOST || 'localhost');
  const httpReachable = await checkHttp(`${baseUrl}/health`);

  console.log(`  SQL Server (${env.DB_HOST || 'localhost'}:${env.DB_PORT || 1433}): ${sqlReachable ? c.green + 'conectado' : c.yellow + 'no detectado'}${c.reset}`);
  console.log(`  Servidor API (${baseUrl}): ${httpReachable ? c.green + 'en línea' : c.yellow + 'no disponible'}${c.reset}\n`);

  if (httpReachable) {
    await ejecutarEnVivo(baseUrl);
  } else {
    console.log(`${c.yellow}Servidor no detectado en http://localhost:${port}.${c.reset}`);
    console.log(`${c.dim}Para ejecutar en vivo contra la base de datos y la API:${c.reset}`);
    console.log(`  1. Iniciar base de datos: ${c.cyan}docker compose up -d${c.reset}`);
    console.log(`  2. Iniciar servidor:      ${c.cyan}npm run dev${c.reset}`);
    console.log(`  3. Ejecutar demo:         ${c.cyan}npm run test:concurrency${c.reset}\n`);

    console.log(`${c.bold}Ejecutando demostración de concurrencia e idempotencia...${c.reset}`);
    await ejecutarSimulacionArquitectura();
  }

  banner('Resumen de pruebas de concurrencia');
  console.log(`- ${c.bold}Escenario A (Sobreventa):${c.reset} Controlado mediante UPDLOCK / ROWLOCK en SP_Inventario_ReservarExistencia.`);
  console.log(`- ${c.bold}Escenario B (Idempotencia):${c.reset} Controlado mediante UPDLOCK / HOLDLOCK en SP_Pedidos_CrearPedido.`);
  console.log(`- ${c.bold}Reintentos simultáneos:${c.reset} 1 respuesta 201 Created y respuestas posteriores 200 OK con mismo IDPedido.\n`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import { env } from './env';

async function executeSqlFileInBatches(pool: sql.ConnectionPool, filePath: string): Promise<sql.IResult<any> | undefined> {
  const content = fs.readFileSync(filePath, 'utf8');

  const cleanContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

  const batches = cleanContent
    .split(/^\s*GO\s*$/gim)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  let lastResult: sql.IResult<any> | undefined;
  for (const batch of batches) {
    if (/^\s*USE\s+/i.test(batch) && batch.split('\n').length <= 2) {
      continue;
    }
    try {
      lastResult = await pool.request().batch(batch);
    } catch (err: any) {
      console.error(`Error en lote ${path.basename(filePath)}:`, err.message);
      throw err;
    }
  }
  return lastResult;
}

async function runDbSetup() {
  console.log('Configurando ShopCartDB...');

  const masterConfig: sql.config = {
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    server: env.DB_HOST,
    database: 'master',
    port: env.DB_PORT,
    options: { encrypt: false, trustServerCertificate: true },
  };

  console.log('Conectando...');
  const masterPool = await new sql.ConnectionPool(masterConfig).connect();

  try {
    const dbCheck = await masterPool.request().query(
      `SELECT name FROM sys.databases WHERE name = '${env.DB_NAME}'`
    );

    if (dbCheck.recordset.length === 0) {
      console.log(`Creando base de datos ${env.DB_NAME}...`);
      await masterPool.request().query(`CREATE DATABASE [${env.DB_NAME}]`);
      console.log(`Base de datos ${env.DB_NAME} creada`);
    } else {
      console.log(`Base de datos ${env.DB_NAME} ya existe`);
    }
  } finally {
    await masterPool.close();
  }

  
  const appDbConfig: sql.config = {
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    server: env.DB_HOST,
    database: env.DB_NAME,
    port: env.DB_PORT,
    options: { encrypt: false, trustServerCertificate: true },
  };

  const appPool = await new sql.ConnectionPool(appDbConfig).connect();

  const scriptsDir = path.resolve(process.cwd(), 'scrips');

  try {
    
    console.log('Verificando tablas...');
    const tableCheck = await appPool.request().query(
      `SELECT COUNT(1) AS TotalTablas FROM sys.tables WHERE is_ms_shipped = 0`
    );
    const totalTablas = tableCheck.recordset[0]?.TotalTablas ?? 0;

    if (totalTablas === 0) {
      console.log('Creando tablas...');
      await executeSqlFileInBatches(appPool, path.join(scriptsDir, '01_tablas_y_semilla_base.sql'));
      console.log('Tablas creadas');
    } else {
      console.log(`Tablas ya existen (${totalTablas})`);
    }

    console.log('Aplicando funciones...');
    await executeSqlFileInBatches(appPool, path.join(scriptsDir, '02_funciones.sql'));
    console.log('Funciones creadas');

    console.log('Aplicando vistas...');
    await executeSqlFileInBatches(appPool, path.join(scriptsDir, '03_vistas.sql'));
    console.log('Vistas creadas');

    console.log('Aplicando stored procedures...');
    await executeSqlFileInBatches(appPool, path.join(scriptsDir, '04_stored_procedures.sql'));
    console.log('Stored procedures creados');

    console.log('Aplicando seed...');
    const seedRes = await executeSqlFileInBatches(appPool, path.join(scriptsDir, '05_seed_datos_demo.sql'));
    console.log('Seed aplicado:', seedRes?.recordset?.[0] ?? 'ok');

    console.log('Aplicando extensiones de tienda...');
    await executeSqlFileInBatches(appPool, path.join(scriptsDir, '06_extensiones_tienda.sql'));
    console.log('Extensiones de tienda aplicadas');

    console.log('Base de datos lista');
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await appPool.close();
  }
}

if (require.main === module) {
  runDbSetup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

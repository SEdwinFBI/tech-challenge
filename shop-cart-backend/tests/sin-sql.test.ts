import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(__dirname, '..');
const exclusiones = [
  'src/core/config/db-setup.ts',
  'src/features/seed/',
];

function listar(dir: string, ext: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return listar(ruta, ext);
    return ruta.endsWith(ext) ? [ruta] : [];
  });
}

const relativa = (f: string) => path.relative(raiz, f).split(path.sep).join('/');
const excluido = (f: string) => exclusiones.some((x) => relativa(f).startsWith(x));
const fuentes = listar(path.join(raiz, 'src'), '.ts');

const literales = new RegExp([
  String.raw`'(?:\\.|[^'\\\n])*'`,
  String.raw`"(?:\\.|[^"\\\n])*"`,
  String.raw`\x60(?:\\.|[^\x60\\])*\x60`,
].join('|'), 'g');
const patronesSql = [
  /\bSELECT\b[\s\S]*\bFROM\b/i,
  /\bINSERT\s+INTO\b/i,
  /\bUPDATE\b[\s\S]*\bSET\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bMERGE\b/,
  /\bEXEC(?:UTE)?\s+\w/,
  /\bCREATE\b/,
  /\bALTER\b/,
  /\bDROP\b/,
  /\bTRUNCATE\b/,
];

describe('Acceso a datos solo por procedimientos almacenados', () => {
  it('ningun archivo de src contiene SQL crudo en literales', () => {
    const hallazgos: string[] = [];
    for (const f of fuentes.filter((x) => !excluido(x))) {
      const texto = fs.readFileSync(f, 'utf8');
      for (const m of texto.matchAll(literales)) {
        if (patronesSql.some((p) => p.test(m[0]))) {
          hallazgos.push(`${relativa(f)}: ${m[0].slice(0, 70).replace(/\s+/g, ' ')}`);
        }
      }
    }
    assert.deepEqual(hallazgos, []);
  });

  it('ningun archivo usa query o batch sobre requests de mssql', () => {
    const hallazgos: string[] = [];
    for (const f of fuentes.filter((x) => !excluido(x))) {
      const texto = fs.readFileSync(f, 'utf8');
      for (const m of texto.matchAll(/\.(query|batch)\s*\(/g)) {
        const linea = texto.slice(0, m.index).split('\n').length;
        hallazgos.push(`${relativa(f)}:${linea} ${m[0]}`);
      }
    }
    assert.deepEqual(hallazgos, []);
  });

  it('todo execute recibe un literal SP_Modulo_Accion', () => {
    const valido = /^SP_[A-Z][A-Za-z]+_[A-Za-z]+$/;
    const hallazgos: string[] = [];
    let total = 0;
    for (const f of fuentes) {
      const texto = fs.readFileSync(f, 'utf8');
      for (const m of texto.matchAll(/\.execute\s*(?:<[^>]*>)?\s*\(\s*([^,)]*)/g)) {
        total++;
        const arg = (m[1] ?? "").trim();
        const nombre = /^(['"`])(.*)\1$/.exec(arg)?.[2];
        if (nombre === undefined || !valido.test(nombre)) hallazgos.push(`${relativa(f)}: ${arg}`);
      }
    }
    assert.ok(total > 0);
    assert.deepEqual(hallazgos, []);
  });
});

describe('Convencion de nombres en scrips/', () => {
  const dir = path.join(raiz, 'scrips');
  const scripts = listar(dir, '.sql').map((f) => ({ f, texto: fs.readFileSync(f, 'utf8') }));

  const nombresDe = (tipo: string) => scripts.flatMap(({ f, texto }) =>
    [...texto.matchAll(new RegExp(String.raw`CREATE\s+(?:OR\s+ALTER\s+)?${tipo}\s+(?:dbo\.)?\[?(\w+)`, 'gi'))]
      .map((m) => `${path.basename(f)}: ${m[1]}`));

  it('procedimientos SP_, vistas VW_, funciones FU_', () => {
    const malos = [
      ...nombresDe('(?:PROCEDURE|PROC)').filter((n) => !/: SP_\w+$/.test(n)),
      ...nombresDe('VIEW').filter((n) => !/: VW_\w+$/.test(n)),
      ...nombresDe('FUNCTION').filter((n) => !/: FU_\w+$/.test(n)),
    ];
    assert.deepEqual(malos, []);
  });

  it('llaves primarias con formato ID<Tabla>', () => {
    const malos: string[] = [];
    let tablas = 0;
    for (const { f, texto } of scripts) {
      for (const m of texto.matchAll(/CREATE\s+TABLE\s+(?:dbo\.)?\[?(\w+)\]?\s*\(([\s\S]*?)\n\)\s*;?/gi)) {
        tablas++;
        const tabla = m[1] ?? "";
        const cuerpo = m[2] ?? "";
        const columnas = [...cuerpo.matchAll(/^\s*(\w+)\s+[A-Za-z]+[^\n]*\bPRIMARY\s+KEY\b(?!\s*\()/gim)].map((c) => c[1] ?? "");
        const compuesta = /PRIMARY\s+KEY\s*(?:CLUSTERED\s*)?\(([^)]*)\)/i.exec(cuerpo);
        const pks: string[] = compuesta ? (compuesta[1] ?? "").split(",").map((c) => c.trim().split(/\s+/)[0] ?? "") : columnas;
        if (pks.length === 0) malos.push(`${path.basename(f)}: ${tabla} sin PK detectada`);
        for (const pk of pks) {
          const base = pk.replace(/^ID/, '').toLowerCase();
          const ok = pk.startsWith('ID') && base.length >= 3 && tabla.toLowerCase().startsWith(base.slice(0, Math.min(base.length, 5)));
          if (!ok) malos.push(`${path.basename(f)}: ${tabla}.${pk}`);
        }
      }
    }
    assert.ok(tablas > 0);
    assert.deepEqual(malos, []);
  });
});

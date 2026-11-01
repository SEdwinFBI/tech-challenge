import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const apiRouter = Router();

const featuresPath = __dirname;

const walkAndRegister = (dirPath: string) => {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walkAndRegister(fullPath);
    } else if (/\.routes\.(ts|js)$/.test(file) && !file.endsWith('.d.ts')) {
      const routeName = file.replace(/\.routes\.(ts|js)$/, '');

      try {
        const routeModule = require(fullPath);
        const router = routeModule.default || routeModule[`${routeName}Router`] || routeModule.router;

        if (router) {
          apiRouter.use(`/${routeName}`, router);
          console.log(`Ruta cargada: /api/v1/${routeName}`);
        } else {
          throw new Error(`El archivo de rutas en ${fullPath} no exporta un router válido (${routeName}Router, default o router).`);
        }
      } catch (err) {
        console.error(`Error al cargar el router en ${fullPath}:`, err);
        throw err;
      }
    }
  }
};

if (fs.existsSync(featuresPath)) {
  walkAndRegister(featuresPath);
} else {
  console.error(`No existe la carpeta de features: ${featuresPath}`);
}

export default apiRouter;

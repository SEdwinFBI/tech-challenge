export interface UrlSubidaImagen {
  urlSubida: string;
  urlPublica: string;
  clave: string;
  expiraEn: string;
  cabeceras: Record<string, string>;
}

export interface IImageStorage {
  crearUrlSubida(idProducto: number, contentType: string, tamanoBytes: number): Promise<UrlSubidaImagen>;
  eliminar(urlPublica: string): Promise<void>;
  disponible(): boolean;
}

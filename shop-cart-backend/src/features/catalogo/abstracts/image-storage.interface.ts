export interface UrlSubidaImagen {
  urlSubida: string;
  urlPublica: string;
  clave: string;
  expiraEn: string;
  cabeceras: Record<string, string>;
}

export interface IImageStorage {
  crearUrlSubida(idProducto: number, contentType: string, tamanoBytes: number): Promise<UrlSubidaImagen>;
  eliminar(valorAlmacenado: string): Promise<void>;
  existe(clave: string): Promise<boolean>;
  disponible(): boolean;
}

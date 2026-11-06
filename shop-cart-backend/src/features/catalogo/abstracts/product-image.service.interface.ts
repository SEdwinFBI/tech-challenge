import { ImageSource } from '../domain/stored-image.policy';

export interface IProductImageService {
  prepare(source: ImageSource, idProducto: number): Promise<string>;
  release(previous: Array<string | null | undefined>, keep?: string | null): Promise<void>;
}

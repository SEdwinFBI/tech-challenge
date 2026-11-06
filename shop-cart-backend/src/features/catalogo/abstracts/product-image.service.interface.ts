import { ImageOwner, ImageSource } from '../domain/stored-image.policy';

export interface IProductImageService {
  prepare(source: ImageSource, owner: ImageOwner): Promise<string>;
  release(previous: Array<string | null | undefined>, keep?: string | null): Promise<void>;
}

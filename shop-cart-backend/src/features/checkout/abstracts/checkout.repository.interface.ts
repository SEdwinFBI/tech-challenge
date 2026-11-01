import {
  AddressDTO,
  ConfirmOrderParams,
  ConfirmOrderResult,
  CreateAddressParams,
  DeleteAddressResult,
  MunicipalityDTO,
  ReserveStockResult,
} from '../models/checkout.model';

export interface ICheckoutRepository {
  getMunicipalities(): Promise<MunicipalityDTO[]>;
  getAddresses(idUsuario: number): Promise<AddressDTO[]>;
  createAddress(dto: CreateAddressParams): Promise<AddressDTO[]>;
  deleteAddress(idDireccion: number, idUsuario: number): Promise<DeleteAddressResult>;
  reserveStock(idUsuario: number, idCarrito: number): Promise<ReserveStockResult>;
  confirmOrder(dto: ConfirmOrderParams): Promise<ConfirmOrderResult>;
}

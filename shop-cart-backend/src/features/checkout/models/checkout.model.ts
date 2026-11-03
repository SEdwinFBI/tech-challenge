export interface MunicipalityDTO {
  IDMunicipio: number;
  Municipio: string;
  NombreMunicipio?: string;
  IDDepartamento: number;
  Departamento: string;
  NombreDepartamento?: string;
  IDTarifaEnvio?: number | null;
  CostoEnvio: number;
  MontoMinimoEnvioGratis?: number | null;
}

export interface AddressDTO {
  IDDireccion: number;
  IDUsuario?: number;
  IDMunicipio: number;
  Etiqueta?: string;
  IDDepartamento?: number;
  Departamento?: string;
  Municipio?: string;
  NombreMunicipio?: string;
  NombreDepartamento?: string;
  CostoEnvio?: number;
  MontoMinimoEnvioGratis?: number | null;
  DireccionExacta: string;
  Direccion?: string;
  TelefonoContacto: string;
  Telefono?: string;
  Referencia?: string | null;
  Predeterminada?: boolean;
  Activo?: boolean;
}

export interface CreateAddressParams {
  idUsuario: number;
  etiqueta: string;
  idMunicipio?: number;
  idTarifaEnvio?: number;
  municipio?: string;
  direccionExacta: string;
  telefonoContacto: string;
  predeterminada?: boolean;
}

export type DeleteAddressResult = AddressDTO[];

export interface ReserveStockResult {
  ReservaExpiracion?: Date | string;
  Mensaje?: string;
  [key: string]: unknown;
}

export interface ConfirmOrderParams {
  idUsuario: number;
  idCarrito: number;
  idDireccion: number;
  claveIdempotencia: string;
  simularFalloPago: boolean;
}

export interface ConfirmOrderResult {
  IDPedido: number;
  NumeroPedido?: string;
  Total?: number;
  FueIdempotente?: number;
  Mensaje?: string;
}

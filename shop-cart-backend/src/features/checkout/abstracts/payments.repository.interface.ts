import {
  ActualizarEstadoOpciones,
  ContextoPago,
  EstadoIntentoPago,
  IntentoPendienteDTO,
  ListPaymentsParams,
  ListPaymentsResult,
  RegistrarIntentoParams,
} from '../models/payments.model';

export interface IPaymentsRepository {
  obtenerContexto(idUsuario: number, idCarrito: number, idDireccion: number, clave: string): Promise<ContextoPago>;
  registrarIntento(params: RegistrarIntentoParams): Promise<number>;
  actualizarEstado(idIntentoPago: number, nuevoEstado: EstadoIntentoPago, opciones?: ActualizarEstadoOpciones): Promise<void>;
  listarPendientes(): Promise<IntentoPendienteDTO[]>;
  listar(params: ListPaymentsParams): Promise<ListPaymentsResult>;
}

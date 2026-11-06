import type { RecommendationContext, RecommendationPlacement } from '../models/recomendaciones.model';

interface RecommendationPolicy {
  instruction: string;
  signals: (context: RecommendationContext) => RecommendationContext['signals'];
  excludesFavorites?: boolean;
}

const allSignals = (context: RecommendationContext) => context.signals;

export const recommendationPolicies: Record<RecommendationPlacement, RecommendationPolicy> = {
  producto: { instruction: 'Prioriza alternativas relacionadas con sus intereses.', signals: allSignals },
  carrito: { instruction: 'Prioriza complementos compatibles con el carrito.', signals: allSignals },
  inicio: { instruction: 'Selecciona descubrimientos relevantes para sus preferencias, con variedad de productos.', signals: allSignals },
  favoritos: {
    instruction: 'Sugiere alternativas y complementos de los favoritos guardados.',
    signals: context => context.signals.filter(s => s.Tipo === 'FAVORITO'),
    excludesFavorites: true,
  },
  ofertas: { instruction: 'Prioriza las ofertas vigentes que mejor encajen con sus intereses y presupuesto.', signals: allSignals },
};

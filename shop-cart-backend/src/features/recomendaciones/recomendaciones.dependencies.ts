import { obtenerCache } from '@/core/cache/cache.factory';
import { jevScoreClient } from '@/core/ai/ai.dependencies';
import { RecommendationRepository } from './repository/recomendaciones.repository';
import { JevClient } from './infrastructure/jev.client';
import { GetRecommendationsQueryHandler } from './queries/get-recommendations.query';
import { RecordRecommendationViewCommandHandler } from './commands/record-recommendation-view.command';
import { GetSearchRecommendationQueryHandler } from './queries/get-search-recommendation.query';
import { SearchCandidateRepository } from './repository/search-candidate.repository';
import { JevSearchProductSelector } from './infrastructure/jev-search-product.selector';

const repository = new RecommendationRepository();
export const getRecommendations = new GetRecommendationsQueryHandler(repository, new JevClient(jevScoreClient), obtenerCache());
export const recordRecommendationView = new RecordRecommendationViewCommandHandler(repository);
export const getSearchRecommendation = new GetSearchRecommendationQueryHandler(new SearchCandidateRepository(), new JevSearchProductSelector(jevScoreClient), obtenerCache());

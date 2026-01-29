import { Product, Batch, Recommendation } from '../types';

/**
 * AI Logic / Suggestion Engine
 * Analyzes the current selection to provide Cross-selling and Up-selling tips.
 */
export const getRecommendations = (product: Product, currentBatch?: Batch): Recommendation[] => {
  const recommendations: Recommendation[] = [];

  // Logic 1: Cross-selling based on Category
  if (product.category === 'Lana' || product.category === 'Hilo') {
    recommendations.push({
      type: 'cross-sell',
      message: '¿Cliente necesita herramientas?',
      productName: 'Sugerir: Palillos, Crochet o Agujas de coser.'
    });

    recommendations.push({
      type: 'cross-sell',
      message: 'Complementos ideales:',
      productName: 'Sugerir: Botones, Cintas o Marcadores de puntos.'
    });
  }

  // Logic 2: Up-selling based on Quantity/Weight (Simulated)
  if (currentBatch) {
    if (parseInt(currentBatch.weight) < 100) {
       recommendations.push({
        type: 'up-sell',
        message: 'Formato pequeño detectado.',
        productName: 'Ofrecer ovillo de 100g para mayor rendimiento.'
      });
    }

    if (currentBatch.quantity > 3) {
      recommendations.push({
        type: 'up-sell',
        message: 'Alto volumen de compra.',
        productName: 'Ofrecer Pack Promocional (3x2) o descuento mayorista.'
      });
    }
  }

  // Logic 3: Specific Tag matching
  if (product.tags?.includes('invierno')) {
     recommendations.push({
      type: 'cross-sell',
      message: 'Temporada de Invierno:',
      productName: 'Ofrecer patrones de bufandas o gorros.'
    });
  }

  return recommendations;
};

import { db } from "../db/db";
import { GoogleGenAI } from "@google/genai";
import { Sale, Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface FinancialMetrics {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  ticketAverage: number;
  transactionCount: number;
  marginPercent: number;
}

export interface DateRange {
  start: number;
  end: number;
}

/**
 * Fetch sales within a specific date range.
 */
export const getSalesByRange = async (range: DateRange): Promise<Sale[]> => {
  return await db.sales
    .where('timestamp')
    .between(range.start, range.end, true, true)
    .reverse() // Newest first
    .toArray();
};

/**
 * Calculate financial KPIs from a set of sales.
 */
export const calculateFinancials = (sales: Sale[]): FinancialMetrics => {
  let totalRevenue = 0;
  let totalCost = 0;

  sales.forEach(sale => {
    // Only count completed sales, ignore voided
    if (sale.status === 'completed') {
      totalRevenue += sale.total;
      
      // Calculate Cost based on items
      sale.items.forEach(item => {
        const cost = item.costPerItem || 0; 
        totalCost += (cost * item.quantity);
      });
    }
  });

  const netProfit = totalRevenue - totalCost;
  const transactionCount = sales.filter(s => s.status === 'completed').length;
  const ticketAverage = transactionCount > 0 ? totalRevenue / transactionCount : 0;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    netProfit,
    ticketAverage,
    transactionCount,
    marginPercent
  };
};

/**
 * Basic Market Basket Analysis to find frequent pairs
 */
const getFrequentPairs = (sales: Sale[]) => {
  const pairCounts: Record<string, number> = {};
  sales.forEach(sale => {
    if (sale.items.length < 2) return;
    // Get unique product names in this basket
    const uniqueItems = Array.from(new Set(sale.items.map(i => i.name))).sort();
    
    // Generate pairs
    for (let i = 0; i < uniqueItems.length; i++) {
      for (let j = i + 1; j < uniqueItems.length; j++) {
        const pair = `${uniqueItems[i]} + ${uniqueItems[j]}`;
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      }
    }
  });

  // Return top 3 pairs
  return Object.entries(pairCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pair, count]) => `- ${pair} (Comprados juntos ${count} veces)`)
    .join('\n');
};

/**
 * AI Strategic Advisor: Analyzes trends, suggests discounts, and finds associations.
 */
export const generateStrategicAdvice = async (sales: Sale[]): Promise<string> => {
  try {
    // 1. Prepare Data Context
    const products = await db.products.toArray();
    
    // Group Sales by Product for trends
    const productPerformance: Record<string, { qty: number, revenue: number }> = {};
    
    sales.forEach(s => {
      s.items.forEach(i => {
        if (!productPerformance[i.name]) productPerformance[i.name] = { qty: 0, revenue: 0 };
        productPerformance[i.name].qty += i.quantity;
        productPerformance[i.name].revenue += (i.price || 0) * i.quantity;
      });
    });

    // Identify Slow Moving Stock (High stock, low sales in period)
    const slowStock = products
      .filter(p => p.stockTotal > 5 && (!productPerformance[p.name] || productPerformance[p.name].qty < 2))
      .map(p => `${p.name} (Stock: ${p.stockTotal}, Costo: $${p.costPerItem || 'N/A'}, Precio: $${p.price})`)
      .slice(0, 5)
      .join(', ');

    // Identify Top Sellers
    const topSellers = Object.entries(productPerformance)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, data]) => `${name} ($${data.revenue})`)
      .join(', ');

    // Identify Associations (Cross-Selling)
    const associations = getFrequentPairs(sales);

    const prompt = `
      Actúa como Consultor Estratégico de Retail para "D&D Industries" (Bazar de barrio en Chile).
      La dueña (Mamá Admin) necesita un análisis del periodo seleccionado.

      DATOS DEL PERIODO:
      - Productos Más Vendidos: ${topSellers}
      - Inventario Lento (Posible Estancamiento): ${slowStock}
      - Patrones de Compra (Productos llevados juntos):
      ${associations || "No se detectaron patrones claros aún."}
      
      Genera un reporte en 3 secciones breves con tono cercano, directo y estratégico:

      1. 📈 TENDENCIAS Y PATRONES: 
         - Resume qué se vende bien.
         - Si hay patrones de compra (ej. Lana + Agujas), menciónalos explícitamente como una oportunidad. Ej: "El 70% lleva X con Y".
      
      2. 🏷️ OPORTUNIDAD DE LIQUIDACIÓN (Smart Discount): 
         - Mira el "Inventario Lento". Sugiere un descuento específico (ej. 20%) para liquidar stock sin perder dinero (considera el costo).
      
      3. 💡 SUGERENCIA DE KIT O PACK: 
         - Basado en los "Patrones de Compra", sugiere armar un Kit (ej. "Kit Principiante: Lana + Palillos con 10% dcto").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    return response.text || "No se pudo generar el análisis estratégico.";

  } catch (error) {
    console.error("AI Error:", error);
    return "Error de conexión con el Asistente Inteligente.";
  }
};

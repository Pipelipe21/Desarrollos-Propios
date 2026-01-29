import { GoogleGenAI } from "@google/genai";
import { db } from "../db/db";
import { Sale, Product, CashShift, SyncStatus, DiagnosticLog, Equipment } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface WeeklyData {
  sales: Sale[];
  products: Product[];
  shifts: CashShift[];
}

export interface AnalyticsSummary {
  totalSales: number;
  topProduct: string;
  cashDiscrepancy: number;
  salesByCategory: { name: string; value: number; color: string; percent: number }[];
  dailySales: { date: string; value: number; height: number }[];
}

const gatherWeeklyData = async (): Promise<WeeklyData> => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  const sales = await db.sales
    .where('timestamp')
    .above(sevenDaysAgo)
    .toArray();
    
  const products = await db.products.toArray();
  
  // filtering in memory as startTime is not indexed in version 3 of db schema provided
  const shifts = await db.cashShifts
    .filter(shift => shift.startTime > sevenDaysAgo)
    .toArray();

  return { sales, products, shifts };
};

export const calculateAnalytics = async (): Promise<AnalyticsSummary> => {
  const data = await gatherWeeklyData();
  const totalSales = data.sales.reduce((sum, s) => sum + s.total, 0);

  const productCounts: Record<string, number> = {};
  data.sales.forEach(s => {
    s.items.forEach(i => {
      productCounts[i.name] = (productCounts[i.name] || 0) + i.quantity;
    });
  });
  const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
  const topProduct = sortedProducts.length > 0 ? `${sortedProducts[0][0]} (${sortedProducts[0][1]})` : 'Sin ventas';

  const cashDiscrepancy = data.shifts.reduce((acc, s) => {
    if (s.status === 'closed' && s.declaredAmount !== undefined && s.expectedAmount !== undefined) {
      return acc + (s.declaredAmount - s.expectedAmount);
    }
    return acc;
  }, 0);

  const catMap: Record<string, number> = {};
  let totalCatValue = 0;
  data.sales.forEach(s => {
    s.items.forEach(i => {
      const val = (i.price || 0) * i.quantity;
      catMap[i.category] = (catMap[i.category] || 0) + val;
      totalCatValue += val;
    });
  });

  const salesByCategory = Object.entries(catMap).map(([name, value], idx) => ({
    name, 
    value,
    color: ['bg-pink-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500'][idx % 4],
    percent: totalCatValue > 0 ? Math.round((value / totalCatValue) * 100) : 0
  })).sort((a, b) => b.value - a.value);

  const daysMap: Record<string, number> = {};
  const today = new Date();
  const last7Days: string[] = [];
  for (let i=6; i>=0; i--) {
     const d = new Date();
     d.setDate(today.getDate() - i);
     const label = d.toLocaleDateString('es-CL', {weekday: 'short'}); 
     last7Days.push(label);
     daysMap[label] = 0;
  }
  
  let maxDaily = 0;
  data.sales.forEach(s => {
    const day = new Date(s.timestamp).toLocaleDateString('es-CL', {weekday: 'short'});
    if (daysMap[day] !== undefined) {
      daysMap[day] += s.total;
      if (daysMap[day] > maxDaily) maxDaily = daysMap[day];
    }
  });
  
  const dailySales = last7Days.map(date => ({ 
    date, 
    value: daysMap[date],
    height: maxDaily > 0 ? Math.round((daysMap[date] / maxDaily) * 100) : 0
  }));

  return { totalSales, topProduct, cashDiscrepancy, salesByCategory, dailySales };
};

export const generateWeeklyReport = async (): Promise<string> => {
  try {
     const data = await gatherWeeklyData();
     
     const totalSales = data.sales.reduce((sum, s) => sum + s.total, 0);
     const salesCount = data.sales.length;
     
     const prompt = `
       Actúa como consultor de negocios experto.
       Analiza los siguientes datos de la última semana:
       - Total Ventas: $${totalSales}
       - Cantidad de Transacciones: ${salesCount}
       - Turnos de Caja: ${data.shifts.length}
       
       Genera un reporte ejecutivo breve (máx 3 párrafos) destacando el rendimiento, 
       posibles alertas de seguridad (si hay diferencias de caja) y recomendaciones 
       para la próxima semana. Tono profesional y motivador.
     `;
     
     const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
     });
     return response.text || "Reporte no disponible.";
  } catch (e) {
      return "Error de conexión IA.";
  }
};


/**
 * MACHINERY MODULE AI
 * Diagnoses machine failure based on symptoms and historical logs.
 * ENHANCED: Now includes context from Completed Work Orders (Knowledge Base).
 */
export const diagnoseMachinery = async (machine: Equipment, symptoms: string): Promise<string> => {
  try {
    // 1. Fetch Diagnostic History
    const history = await db.diagnosticLogs
      .where('machineId').equals(machine.id || 0)
      .and(log => !!log.mechanicFeedback) 
      .reverse()
      .limit(3)
      .toArray();

    // 2. Fetch Knowledge Base (Closed Work Orders with Expert Notes)
    const workOrders = await db.workOrders
      .where('machineId').equals(machine.id || 0)
      .and(wo => (wo.status === 'finished' || wo.status === 'validated') && !!wo.expertNotes)
      .reverse()
      .limit(3)
      .toArray();

    const diagnosticContext = history.map(h => 
      `- [Diagnóstico] Falla: "${h.symptoms}". Solución: "${h.mechanicFeedback}"`
    ).join('\n');

    const expertContext = workOrders.map(wo => 
      `- [OT #${wo.id} - ${wo.title}]: Nota Experto: "${wo.expertNotes}"`
    ).join('\n');

    const prompt = `
      Eres un MECÁNICO EXPERTO en maquinaria pesada (Caterpillar, Komatsu, John Deere).
      
      MÁQUINA: ${machine.brand} ${machine.model} (Año ${machine.year}).
      HORÓMETRO: ${machine.currentHourMeter} horas.
      
      SÍNTOMAS REPORTADOS:
      "${symptoms}"

      BASE DE CONOCIMIENTO (HISTORIAL TÉCNICO):
      ${diagnosticContext || "Sin diagnósticos previos."}
      ${expertContext || "Sin notas de expertos previas."}

      TAREA:
      Analiza los síntomas y sugiere 3 posibles causas técnicas, ordenadas por probabilidad.
      Usa el historial y las notas del experto si son relevantes.
      Devuelve la respuesta en formato JSON estricto:
      [
        { "cause": "Título breve", "probability": "Alta/Media/Baja", "action": "Acción técnica específica" },
        ...
      ]
      
      IMPORTANTE: No añadas texto fuera del JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    return response.text || "[]";

  } catch (error) {
    console.error("Diagnostic Error:", error);
    throw new Error("No se pudo conectar con el Asistente Técnico.");
  }
};

/**
 * WORKSHOP ASSISTANT AI
 */
export const consultWorkshopAssistant = async (userQuery: string): Promise<string> => {
  try {
    // 1. Gather Workshop Context (RAG)
    const parts = await db.spareParts.toArray();
    const tools = await db.tools.toArray();
    
    // Minimize token usage by mapping only essential fields
    const partsContext = parts.map(p => 
      `${p.name} (Marca: ${p.brand}, OEM: ${p.oemCode}): Stock ${p.currentStock} (Min: ${p.minStock}). Ubicación: ${p.location}. Modelos: ${p.compatibleModels.join(',')}`
    ).join('\n');

    const toolsContext = tools.map(t => 
      `${t.name} (${t.brand}): Estado: ${t.status === 'in_use' ? `EN USO por ${t.assignedTo}` : 'DISPONIBLE'}.`
    ).join('\n');

    const prompt = `
      Eres el ASISTENTE DE PAÑOL (Bodeguero Inteligente) de un taller de maquinaria.
      
      INVENTARIO REPUESTOS:
      ${partsContext}

      HERRAMIENTAS:
      ${toolsContext}

      PREGUNTA DEL JEFE DE TALLER:
      "${userQuery}"

      INSTRUCCIONES:
      Responde de forma directa, técnica y útil.
      - Si preguntan por ubicación, dala exacta.
      - Si preguntan cantidad, menciona si está bajo stock crítico (menor al mínimo).
      - Si preguntan por una herramienta, di quién la tiene si está ocupada.
      - Si no existe el ítem, sugiérelo basado en el nombre.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    return response.text || "No tengo información sobre eso en el sistema.";

  } catch (error) {
    console.error("Workshop AI Error:", error);
    return "Error consultando el inventario.";
  }
};

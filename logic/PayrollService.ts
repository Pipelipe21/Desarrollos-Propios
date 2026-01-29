import { db } from "../db/db";
import { EmployeeProfile, PayrollConfig, PayrollRecord } from "../types";
import { jsPDF } from "jspdf";

/**
 * Calculates income tax based on Chilean brackets (Simplified Table 2024/2025).
 * Figures are examples, usually these are monthly UTM factors.
 */
const calculateIncomeTax = (taxableIncome: number, utm: number): number => {
  // Simplified logic. In production, this uses a full table of factors/rebates.
  // 13.5 UTM approx exemption limit
  const taxableUTM = taxableIncome / utm;
  
  if (taxableUTM <= 13.5) return 0;
  if (taxableUTM <= 30) return (taxableIncome * 0.04) - (0.54 * utm);
  if (taxableUTM <= 50) return (taxableIncome * 0.08) - (1.74 * utm);
  // ... simplified upper brackets
  return (taxableIncome * 0.135) - (4.49 * utm);
};

export const calculatePayroll = (
  employee: EmployeeProfile, 
  config: PayrollConfig, 
  daysWorked: number
): PayrollRecord => {
  
  // 1. Proportional Base Salary
  const baseSalaryCalculated = Math.round((employee.baseSalary / 30) * daysWorked);

  // 2. Gratification (Legal 25% with Cap 4.75 IMM / 12)
  const legalCap = (4.75 * config.immValue) / 12;
  const theoreticalGrat = baseSalaryCalculated * 0.25;
  const gratification = Math.min(theoreticalGrat, legalCap);

  // 3. Taxable Income
  const totalTaxable = baseSalaryCalculated + gratification;

  // 4. Non-Taxable Income (Liquido)
  // These are usually paid fully if daysWorked > 0, or proportional. Let's make proportional.
  const transportAllowance = Math.round((employee.transportAllowance / 30) * daysWorked);
  const lunchAllowance = Math.round((employee.lunchAllowance / 30) * daysWorked);
  const totalNonTaxable = transportAllowance + lunchAllowance;

  // 5. Social Security Discounts (Leyes Sociales)
  // AFP
  const afpAmount = Math.round(totalTaxable * (employee.afpRate / 100));

  // Health (7% or Isapre UF)
  let healthAmount = 0;
  if (employee.healthSystem === 'Fonasa') {
    healthAmount = Math.round(totalTaxable * 0.07);
  } else {
    // Isapre: UF value converted, but minimum 7% of taxable
    const legal7 = Math.round(totalTaxable * 0.07);
    const planCost = Math.round((employee.healthAmountUF || 0) * config.ufValue);
    healthAmount = Math.max(legal7, planCost);
  }

  // Unemployment Insurance (AFC)
  // Indefinite: 0.6% Employee, 2.4% Employer
  // Fixed: 0% Employee, 3% Employer
  let unemploymentInsurance = 0;
  if (employee.contractType === 'indefinido') {
    unemploymentInsurance = Math.round(totalTaxable * 0.006);
  }

  // 6. Tax Base Calculation
  const taxBase = totalTaxable - afpAmount - healthAmount - unemploymentInsurance;
  const incomeTax = Math.round(calculateIncomeTax(taxBase, config.utmValue));

  const totalDiscounts = afpAmount + healthAmount + unemploymentInsurance + incomeTax;

  // 7. Final Liquid
  const liquidSalary = (totalTaxable + totalNonTaxable) - totalDiscounts;

  // 8. Employer Cost (Approx)
  // SIS (1.49% approx), AFC Employer (2.4% or 3%), Mutual (0.93% basic), Basic + Gratification
  let employerAFC = 0;
  if (employee.contractType === 'indefinido') employerAFC = Math.round(totalTaxable * 0.024);
  else employerAFC = Math.round(totalTaxable * 0.03);

  const sis = Math.round(totalTaxable * (config.sisRate / 100));
  const mutual = Math.round(totalTaxable * 0.0093); // Basic rate

  const employerCost = totalTaxable + totalNonTaxable + employerAFC + sis + mutual;

  return {
    employeeId: employee.id!,
    period: `${config.month}-${config.year}`,
    daysWorked,
    baseSalaryCalculated,
    gratification,
    totalTaxable,
    lunchAllowance,
    transportAllowance,
    totalNonTaxable,
    afpAmount,
    healthAmount,
    unemploymentInsurance,
    incomeTax,
    totalDiscounts,
    liquidSalary,
    employerCost,
    generatedAt: Date.now()
  };
};

/**
 * Generates a PDF Payslip (Liquidación de Sueldo)
 */
export const generatePayslipPDF = async (record: PayrollRecord, employeeName: string, employeeRut: string) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(14);
  doc.text("D&D INDUSTRIES - LIQUIDACIÓN DE SUELDO", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.text(`Periodo: ${record.period}`, 105, 26, { align: "center" });
  
  // Employee Info
  doc.rect(14, 35, 182, 25);
  doc.text(`Nombre: ${employeeName}`, 20, 42);
  doc.text(`RUT: ${employeeRut}`, 20, 48);
  doc.text(`Días Trabajados: ${record.daysWorked}`, 120, 42);
  doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 120, 48);

  // Columns
  let y = 70;
  doc.setFontSize(11);
  doc.text("HABERES", 20, y);
  doc.text("DESCUENTOS", 110, y);
  doc.line(14, y+2, 196, y+2);
  
  y += 10;
  doc.setFontSize(10);
  
  // Haberes Items
  doc.text(`Sueldo Base:`, 20, y); 
  doc.text(`$${record.baseSalaryCalculated.toLocaleString('es-CL')}`, 90, y, { align: 'right' });
  
  y += 6;
  doc.text(`Gratificación Legal:`, 20, y);
  doc.text(`$${record.gratification.toLocaleString('es-CL')}`, 90, y, { align: 'right' });
  
  y += 6;
  doc.text(`Movilización:`, 20, y);
  doc.text(`$${record.transportAllowance.toLocaleString('es-CL')}`, 90, y, { align: 'right' });
  
  y += 6;
  doc.text(`Colación:`, 20, y);
  doc.text(`$${record.lunchAllowance.toLocaleString('es-CL')}`, 90, y, { align: 'right' });
  
  // Descuentos Items
  let yRight = 80;
  doc.text(`AFP:`, 110, yRight);
  doc.text(`$${record.afpAmount.toLocaleString('es-CL')}`, 190, yRight, { align: 'right' });
  
  yRight += 6;
  doc.text(`Salud:`, 110, yRight);
  doc.text(`$${record.healthAmount.toLocaleString('es-CL')}`, 190, yRight, { align: 'right' });
  
  yRight += 6;
  doc.text(`Seguro Cesantía:`, 110, yRight);
  doc.text(`$${record.unemploymentInsurance.toLocaleString('es-CL')}`, 190, yRight, { align: 'right' });
  
  yRight += 6;
  doc.text(`Impuesto Único:`, 110, yRight);
  doc.text(`$${record.incomeTax.toLocaleString('es-CL')}`, 190, yRight, { align: 'right' });

  // Totals
  const yTotal = Math.max(y, yRight) + 20;
  doc.line(14, yTotal, 196, yTotal);
  
  doc.setFontSize(12);
  doc.text(`TOTAL HABERES:`, 20, yTotal + 10);
  doc.text(`$${(record.totalTaxable + record.totalNonTaxable).toLocaleString('es-CL')}`, 90, yTotal + 10, { align: 'right' });
  
  doc.text(`TOTAL DESCUENTOS:`, 110, yTotal + 10);
  doc.text(`$${record.totalDiscounts.toLocaleString('es-CL')}`, 190, yTotal + 10, { align: 'right' });
  
  // Liquid
  doc.setFillColor(230, 230, 230);
  doc.rect(14, yTotal + 20, 182, 15, 'F');
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("ALCANCE LÍQUIDO A PAGAR:", 20, yTotal + 30);
  doc.text(`$${record.liquidSalary.toLocaleString('es-CL')}`, 190, yTotal + 30, { align: 'right' });
  
  // Signatures
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const ySig = yTotal + 80;
  
  doc.line(30, ySig, 90, ySig);
  doc.text("EMPLEADOR", 60, ySig + 5, { align: 'center' });
  
  doc.line(120, ySig, 180, ySig);
  doc.text("TRABAJADOR", 150, ySig + 5, { align: 'center' });
  
  doc.text("Recibí conforme el alcance líquido indicado.", 105, ySig + 20, { align: 'center' });

  // Download
  doc.save(`Liquidacion_${employeeRut}_${record.period}.pdf`);
};
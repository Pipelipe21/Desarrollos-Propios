export enum UserRole {
  ADMIN = 'admin',
  VENDEDORA = 'vendedora',
  OPERADOR = 'operador',
  ESPECIALISTA = 'especialista'
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed'
}

export enum LogType {
  SALE = 'venta',
  ENTRY = 'ingreso',
  MAINTENANCE = 'mantenimiento',
  LOGIN = 'login',
  AUDIT_CART_REMOVE = 'audit_cart_remove',
  AUDIT_SALE_VOID = 'audit_sale_void',
  SHIFT_OPEN = 'shift_open',
  SHIFT_CLOSE = 'shift_close',
  ATTENDANCE_IN = 'attendance_in',
  ATTENDANCE_OUT = 'attendance_out',
  DIAGNOSTIC = 'diagnostic',
  CHECKLIST = 'checklist',
  TOOL_CHECKOUT = 'tool_checkout',
  TOOL_RETURN = 'tool_return',
  WORK_ORDER_UPDATE = 'work_order_update',
  MACHINE_UPDATE = 'machine_update',
  TASK_UPDATE = 'task_update',
  PAYROLL_GENERATED = 'payroll_generated'
}

// Database Schema Interfaces
export interface User {
  id?: number;
  username: string;
  fullName: string;
  role: UserRole;
  department: 'bazar' | 'taller'; // Strict separation field
  passwordHash: string;
  geoFenceAllowed?: string;
}

// --- PAYROLL & HR TYPES (NOMINACL) ---

export interface EmployeeProfile {
  id?: number;
  userId: number; // Links to User table
  rut: string;
  baseSalary: number; // Sueldo Base
  contractType: 'indefinido' | 'plazo_fijo';
  afpName: string; // e.g., 'Modelo', 'Capital'
  afpRate: number; // e.g., 10.58
  healthSystem: 'Fonasa' | 'Isapre';
  healthAmountUF?: number; // If Isapre, amount in UF. If 0, uses 7%
  lunchAllowance: number; // Asignación Colación (No Imponible)
  transportAllowance: number; // Asignación Movilización (No Imponible)
}

export interface PayrollConfig {
  id?: number; // Singleton (id: 1)
  month: number;
  year: number;
  ufValue: number;
  utmValue: number;
  immValue: number; // Ingreso Mínimo Mensual
  topImponibleUF: number; // Tope Imponible (e.g. 84.3 UF)
  sisRate: number; // Seguro Invalidez y Sobrevivencia (Employer cost)
}

export interface PayrollRecord {
  id?: number;
  employeeId: number;
  period: string; // "MM-YYYY"
  daysWorked: number;
  
  // Haberes
  baseSalaryCalculated: number; // Proportional to days
  gratification: number; // 25% capped
  totalTaxable: number; // Total Imponible
  
  lunchAllowance: number;
  transportAllowance: number;
  totalNonTaxable: number; // Total No Imponible

  // Descuentos
  afpAmount: number;
  healthAmount: number;
  unemploymentInsurance: number; // AFC (0.6% employee if indefinite)
  incomeTax: number; // Impuesto Único
  totalDiscounts: number;

  // Final
  liquidSalary: number; // Alcance Líquido
  employerCost: number; // Costo Empresa (SIS + AFC Employer + Mutual)
  
  generatedAt: number;
}

// ... (Rest of existing types remain unchanged)
export interface Task {
  id?: number;
  title: string;
  description?: string;
  assignedTo: number; // User ID
  createdBy: number; // User ID (Admin)
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  dueDate?: number;
  completedAt?: number;
  comments?: string; // Tech feedback
  syncStatus: SyncStatus;
}

export interface Document {
  id?: number;
  title: string;
  type: 'Seguro' | 'Revisión Técnica' | 'Patente' | 'Contrato' | 'Otro';
  expirationDate: number; // Timestamp
  entityRef: string; // e.g., "Grúa Liebherr" or "Local Bazar"
  status: 'active' | 'expired' | 'warning'; // Derived mostly, but stored for caching
}

// PDF MANUAL SYSTEM
export interface Manual {
  id?: number;
  machineId?: number; // Optional link to specific machine
  title: string;
  fileName: string;
  fileData: Blob; // The PDF file itself
  uploadDate: number;
  pageCount: number;
}

export interface ManualSegment {
  id?: number;
  manualId: number;
  pageNumber: number;
  content: string; // Text content of the page/segment
  embedding?: number[]; // For future vector search (optional)
}

// SHOPIFY STANDARD PRODUCT
export interface Product {
  id?: number;
  name: string; // Title
  description?: string; // HTML or Text
  vendor?: string; // Brand/Vendor
  productType?: string; // Category
  category: 'Lana' | 'Hilo' | 'Bazar' | 'Accesorios' | 'Lanas'; 
  tags?: string[];
  images?: string[]; // Array of Base64 or URLs
  stockTotal: number; // Aggregated inventory
  
  // Base Pricing (can be overridden by variants)
  price?: number; 
  compareAtPrice?: number;
  costPerItem?: number;

  ean?: string; // Global barcode
}

// SHOPIFY VARIANT (Mapped to Batch for compatibility)
export interface Batch {
  id?: number;
  productId: number;
  
  // Variant Options
  title?: string; // e.g., "Blue / 100g"
  color: string; // Option 1
  weight?: string; // Option 2
  
  // Inventory
  sku?: string;
  barcode?: string; // Variant specific barcode
  batchNumber: string; // Internal Lot Number
  quantity: number; // Inventory Quantity
  
  // Variant Pricing
  price?: number;
  compareAtPrice?: number;
  
  colorHex?: string;
}

// --- MACHINERY & WORKSHOP TYPES ---

export interface Equipment {
  id?: number;
  model: string;
  brand: string;
  year?: number;
  licensePlate: string; // Patente (Locked)
  vin?: string; // Serial Number (Locked)
  currentHourMeter: number;
  initialHourMeter?: number; // Base (Locked)
  nextMaintenanceAt: number; 
  status: 'operative' | 'maintenance' | 'repair';
  manualUrl?: string;
}

export interface MachineChangeLog {
  id?: number;
  machineId: number;
  userId: number;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

export interface SparePart {
  id?: number;
  name: string;
  oemCode?: string;
  brand?: string;
  minStock: number; // critico
  currentStock: number;
  location: string;
  compatibleModels: string[];
  category: 'Filtros' | 'Hidráulica' | 'Motor' | 'Insumos';
}

export interface Tool {
  id?: number;
  name: string;
  brand: string;
  status: 'available' | 'in_use' | 'damaged';
  assignedTo?: string;
  lastMovement: number;
}

export interface ToolLog {
  id?: number;
  toolId: number;
  userId: number;
  action: 'checkout' | 'return';
  timestamp: number;
  syncStatus: SyncStatus;
}

// --- WORK ORDERS (OT) ---

export type WorkOrderStatus = 'pending' | 'in_process' | 'finished' | 'validated';

export interface WorkOrderStep {
  id: string;
  label: string;
  completed: boolean;
}

export interface WorkOrderPart {
  partId: number;
  name: string;
  quantityUsed: number;
}

export interface WorkOrder {
  id?: number;
  machineId: number;
  technicianId: number;
  createdBy: number;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  checklist: WorkOrderStep[];
  partsUsed: WorkOrderPart[];
  expertNotes?: string;
  photos?: string[];
  syncStatus: SyncStatus;
}

export interface Notification {
  id?: number;
  userId: number;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  linkTo?: string;
}

export interface DiagnosticLog {
  id?: number;
  machineId: number;
  timestamp: number;
  symptoms: string;
  aiAnalysis: string;
  mechanicFeedback?: string;
  syncStatus: SyncStatus;
}

export interface MachineChecklist {
  id?: number;
  machineId: number;
  operatorId: number;
  timestamp: number;
  fluidsOk: boolean;
  tiresOk: boolean;
  leaksDetected: boolean;
  brakesOk: boolean;
  notes: string;
  syncStatus: SyncStatus;
}

export interface TransactionLog {
  id?: number;
  userId: number;
  type: LogType;
  timestamp: number;
  dataJson: string;
  syncStatus: SyncStatus;
}

export interface Recommendation {
  type: 'cross-sell' | 'up-sell';
  message: string;
  productName: string;
}

// --- POS & SALES TYPES ---

export interface CartItem extends Product {
  cartId: string;
  quantity: number;
  selectedBatchId?: number; // Optional: if specific batch selected
  subtotal: number;
}

export type PaymentMethodType = 'cash' | 'card' | 'transfer';

export interface Payment {
  method: PaymentMethodType;
  amount: number;
}

export interface Sale {
  id?: number;
  userId: number;
  timestamp: number;
  items: CartItem[];
  total: number;
  paymentMethods: Payment[];
  status: 'completed' | 'voided';
  syncStatus: SyncStatus;
}

export interface CashShift {
  id?: number;
  userId: number;
  startTime: number;
  endTime?: number;
  initialAmount: number;
  declaredAmount?: number;
  expectedAmount?: number;
  status: 'open' | 'closed';
  syncStatus: SyncStatus;
}

export interface AttendanceRecord {
  id?: number;
  userId: number;
  type: 'entry' | 'exit';
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  syncStatus: SyncStatus;
}
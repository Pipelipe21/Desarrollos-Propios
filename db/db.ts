import { Dexie, type Table } from 'dexie';
import { User, Product, Batch, Equipment, TransactionLog, UserRole, Sale, CashShift, AttendanceRecord, DiagnosticLog, MachineChecklist, SparePart, Tool, ToolLog, WorkOrder, Notification, SyncStatus, Document, MachineChangeLog, Task, Manual, ManualSegment, EmployeeProfile, PayrollRecord, PayrollConfig } from '../types';

class DndDatabase extends Dexie {
  users!: Table<User>;
  products!: Table<Product>;
  batches!: Table<Batch>;
  equipment!: Table<Equipment>;
  logs!: Table<TransactionLog>;
  sales!: Table<Sale>;
  cashShifts!: Table<CashShift>;
  attendance!: Table<AttendanceRecord>;
  diagnosticLogs!: Table<DiagnosticLog>;
  checklists!: Table<MachineChecklist>;
  spareParts!: Table<SparePart>;
  tools!: Table<Tool>;
  toolLogs!: Table<ToolLog>;
  workOrders!: Table<WorkOrder>;
  notifications!: Table<Notification>;
  documents!: Table<Document>;
  machineLogs!: Table<MachineChangeLog>;
  tasks!: Table<Task>;
  manuals!: Table<Manual>;
  manualSegments!: Table<ManualSegment>;
  
  // HR Tables
  employeeProfiles!: Table<EmployeeProfile>;
  payrollRecords!: Table<PayrollRecord>;
  payrollConfig!: Table<PayrollConfig>;

  constructor() {
    super('DndIndustriesDB');
    
    // Version 13: Payroll & HR Module
    this.version(13).stores({
      users: '++id, username, role, department',
      products: '++id, name, category, ean, vendor',
      batches: '++id, productId, batchNumber, color, sku, barcode',
      equipment: '++id, model, licensePlate, status, vin',
      logs: '++id, userId, type, timestamp, syncStatus',
      sales: '++id, userId, timestamp, status, syncStatus',
      cashShifts: '++id, userId, status, syncStatus',
      attendance: '++id, userId, type, timestamp, syncStatus',
      diagnosticLogs: '++id, machineId, timestamp',
      checklists: '++id, machineId, timestamp',
      spareParts: '++id, name, oemCode, brand, category, currentStock',
      tools: '++id, name, status, assignedTo',
      toolLogs: '++id, toolId, userId, timestamp',
      workOrders: '++id, machineId, technicianId, status, createdAt',
      notifications: '++id, userId, read, timestamp',
      documents: '++id, title, type, expirationDate, status',
      machineLogs: '++id, machineId, timestamp',
      tasks: '++id, assignedTo, status, priority, dueDate',
      manuals: '++id, machineId, title',
      manualSegments: '++id, manualId, pageNumber',
      
      // New Tables
      employeeProfiles: '++id, userId, rut',
      payrollRecords: '++id, employeeId, period',
      payrollConfig: '++id' // Singleton
    });

    // SEEDER
    this.on('populate', async () => {
      // 1. USERS - STRICT ROLE SEPARATION
      const userId1 = await this.users.add({ 
          username: 'mama_admin', 
          fullName: 'Mamá (Gerencia Bazar)', 
          role: UserRole.ADMIN, 
          department: 'bazar',
          passwordHash: 'admin123' 
      });
      const userId2 = await this.users.add({ 
          username: 'papa_tuerca', 
          fullName: 'Papá (Gerencia Maquinaria)', 
          role: UserRole.ADMIN, 
          department: 'taller',
          passwordHash: 'admin123' 
      });
      const userId3 = await this.users.add({ 
          username: 'vendedora_pro', 
          fullName: 'Vendedora Bazar', 
          role: UserRole.VENDEDORA, 
          department: 'bazar',
          passwordHash: '123' 
      });
      
      await this.users.bulkAdd([
        { 
          username: 'tecnico_pro', 
          fullName: 'Especialista Técnico', 
          role: UserRole.ESPECIALISTA, 
          department: 'taller',
          passwordHash: '123' 
        },
        { 
          username: 'operador', 
          fullName: 'Operador Maquinaria', 
          role: UserRole.OPERADOR, 
          department: 'taller',
          passwordHash: '123' 
        }
      ]);

      // 2. PAYROLL DEFAULT CONFIG (March 2025 Estimations)
      await this.payrollConfig.add({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        ufValue: 38000,
        utmValue: 66000,
        immValue: 500000,
        topImponibleUF: 84.3,
        sisRate: 1.49
      });

      // 3. EMPLOYEE PROFILES (Examples)
      // Link Vendedora
      await this.employeeProfiles.add({
        userId: userId3 as number,
        rut: '12.345.678-9',
        baseSalary: 550000,
        contractType: 'indefinido',
        afpName: 'Modelo',
        afpRate: 10.58,
        healthSystem: 'Fonasa',
        lunchAllowance: 50000,
        transportAllowance: 40000
      });

      // ... other seed data
      const p1 = await this.products.add({
        name: 'Lana Merino Extra Soft',
        description: 'Lana premium 100% natural, ideal para tejidos de bebé.',
        vendor: 'D&D Lanas',
        category: 'Lanas',
        stockTotal: 50,
        price: 5990,
        costPerItem: 3000,
        ean: '780000000405',
        images: []
      });
      // Variants
      await this.batches.bulkAdd([
        { productId: p1, batchNumber: '405', title: 'Azul / 100g', color: 'Azul', quantity: 20, sku: 'LN-MER-AZ-100', barcode: '7800000004051' },
        { productId: p1, batchNumber: '406', title: 'Rojo / 100g', color: 'Rojo', quantity: 30, sku: 'LN-MER-RJ-100', barcode: '7800000004052' }
      ]);
    });
  }
}

export const db = new DndDatabase();
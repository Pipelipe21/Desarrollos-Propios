import { db as localDb } from "../db/db";
import { remoteDb } from "../db/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { SyncStatus } from "../types";

/**
 * Pushes pending local data to Firebase Firestore.
 * This is the core "Background Sync" logic.
 */
export const syncDataToCloud = async (onProgress: (percent: number) => void): Promise<{ success: boolean; message: string }> => {
  try {
    if (!navigator.onLine) {
      return { success: false, message: 'Sin conexión a internet.' };
    }

    if (!remoteDb) {
      return { success: false, message: 'Servidor no configurado o no disponible (Modo Offline).' };
    }

    onProgress(5);

    // 1. Get Pending Data from Local IndexedDB
    const pendingSales = await localDb.sales.where('syncStatus').equals(SyncStatus.PENDING).toArray();
    const pendingLogs = await localDb.logs.where('syncStatus').equals(SyncStatus.PENDING).toArray();
    const pendingAttendance = await localDb.attendance.where('syncStatus').equals(SyncStatus.PENDING).toArray();
    const pendingWorkOrders = await localDb.workOrders.where('syncStatus').equals(SyncStatus.PENDING).toArray();

    const totalItems = pendingSales.length + pendingLogs.length + pendingAttendance.length + pendingWorkOrders.length;

    if (totalItems === 0) {
      onProgress(100);
      return { success: true, message: 'Todo está actualizado.' };
    }

    let processed = 0;
    const updateProgress = () => {
      processed++;
      const pct = Math.round((processed / totalItems) * 90) + 5; // Scale to 5-95%
      onProgress(pct);
    };

    // 2. Push to Firestore
    
    // --- SYNC SALES ---
    for (const sale of pendingSales) {
      const { id, ...data } = sale;
      await addDoc(collection(remoteDb, 'sales'), { ...data, syncedAt: serverTimestamp() });
      await localDb.sales.update(id!, { syncStatus: SyncStatus.SYNCED });
      updateProgress();
    }

    // --- SYNC LOGS ---
    for (const log of pendingLogs) {
      const { id, ...data } = log;
      await addDoc(collection(remoteDb, 'logs'), { ...data, syncedAt: serverTimestamp() });
      await localDb.logs.update(id!, { syncStatus: SyncStatus.SYNCED });
      updateProgress();
    }

    // --- SYNC ATTENDANCE ---
    for (const att of pendingAttendance) {
      const { id, ...data } = att;
      await addDoc(collection(remoteDb, 'attendance'), { ...data, syncedAt: serverTimestamp() });
      await localDb.attendance.update(id!, { syncStatus: SyncStatus.SYNCED });
      updateProgress();
    }

    // --- SYNC WORK ORDERS ---
    for (const ot of pendingWorkOrders) {
      const { id, ...data } = ot;
      // Work orders might be updated multiple times. 
      // In a real app, we might upsert based on a UUID. 
      // Here we just push the latest snapshot as a history record or new doc.
      await addDoc(collection(remoteDb, 'work_orders'), { ...data, localId: id, syncedAt: serverTimestamp() });
      await localDb.workOrders.update(id!, { syncStatus: SyncStatus.SYNCED });
      updateProgress();
    }

    onProgress(100);
    return { success: true, message: `${totalItems} registros sincronizados con Firebase.` };

  } catch (error) {
    console.error("Firebase Sync Error:", error);
    return { success: false, message: 'Error al sincronizar con la nube.' };
  }
};

/**
 * Exports the entire IndexedDB to a JSON file.
 * Useful for local backup.
 */
export const exportDatabaseToJson = async () => {
  try {
    const allData = {
      users: await localDb.users.toArray(),
      products: await localDb.products.toArray(),
      equipment: await localDb.equipment.toArray(),
      sales: await localDb.sales.toArray(),
      workOrders: await localDb.workOrders.toArray(),
      documents: await localDb.documents.toArray(),
      exportedAt: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `DND_Backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
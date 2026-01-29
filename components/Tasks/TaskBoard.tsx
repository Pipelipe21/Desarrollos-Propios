import React, { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../context/AuthContext';
import { UserRole, SyncStatus, LogType, Task } from '../../types';
import { CheckCircle, Clock, Plus, Trash2, User as UserIcon, Calendar, Save, ListTodo } from 'lucide-react';

const TaskBoard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'create'>('list');
  
  // Create Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [assignedUser, setAssignedUser] = useState<number>(0);
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');

  // Queries
  const allUsers = useLiveQuery(() => db.users.where('role').notEqual(UserRole.ADMIN).toArray());
  
  // Filter tasks based on role
  const tasks = useLiveQuery(() => {
    if (user?.role === UserRole.ADMIN) {
      return db.tasks.reverse().toArray();
    } else {
      return db.tasks.where('assignedTo').equals(user?.id || 0).reverse().toArray();
    }
  }, [user]);

  const isAdmin = user?.role === UserRole.ADMIN;

  const handleCreate = async () => {
    if (!newTaskTitle || !assignedUser) return alert('Complete los campos obligatorios');
    
    await db.tasks.add({
      title: newTaskTitle,
      description: newTaskDesc,
      assignedTo: assignedUser,
      createdBy: user!.id!,
      status: 'pending',
      priority: priority,
      createdAt: Date.now(),
      syncStatus: SyncStatus.PENDING
    });

    setView('list');
    setNewTaskTitle('');
    setNewTaskDesc('');
  };

  const updateStatus = async (task: Task, newStatus: 'in_progress' | 'completed') => {
    await db.tasks.update(task.id!, { 
      status: newStatus,
      completedAt: newStatus === 'completed' ? Date.now() : undefined
    });
    
    await db.logs.add({
      userId: user!.id!,
      type: LogType.TASK_UPDATE,
      timestamp: Date.now(),
      dataJson: JSON.stringify({ taskId: task.id, status: newStatus }),
      syncStatus: SyncStatus.PENDING
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                <ListTodo className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wide">Gestión de Tareas</h2>
                <p className="text-xs text-slate-400">
                  {isAdmin ? 'Asignación Global' : 'Mis Pendientes'}
                </p>
              </div>
           </div>
           
           <div className="flex gap-2">
              {isAdmin && view === 'list' && (
                <button onClick={() => setView('create')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 transition-colors">
                   <Plus className="w-4 h-4" /> Nueva Tarea
                </button>
              )}
              {view === 'create' && (
                <button onClick={() => setView('list')} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold">
                   Cancelar
                </button>
              )}
              <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors">
                 Cerrar
              </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
           
           {/* CREATE FORM (ADMIN ONLY) */}
           {view === 'create' && isAdmin && (
             <div className="max-w-lg mx-auto bg-slate-800 p-8 rounded-2xl border border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
                <h3 className="text-lg font-bold text-white mb-4">Nueva Asignación</h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Título</label>
                  <input 
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Ej: Revisión Grúa LTM"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descripción</label>
                  <textarea 
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-24"
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    placeholder="Detalles de la tarea..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Responsable</label>
                      <select 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={assignedUser}
                        onChange={e => setAssignedUser(Number(e.target.value))}
                      >
                         <option value={0}>Seleccionar...</option>
                         {allUsers?.map(u => (
                           <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                         ))}
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Prioridad</label>
                      <select 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={priority}
                        onChange={e => setPriority(e.target.value as any)}
                      >
                         <option value="low">Baja</option>
                         <option value="medium">Media</option>
                         <option value="high">Alta</option>
                      </select>
                   </div>
                </div>

                <button 
                  onClick={handleCreate}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg mt-4 flex justify-center items-center gap-2"
                >
                   <Save className="w-5 h-5" /> Asignar Tarea
                </button>
             </div>
           )}

           {/* TASK LIST */}
           {view === 'list' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks?.map(task => (
                  <div key={task.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-sm flex flex-col hover:border-blue-500/50 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          task.priority === 'high' ? 'bg-red-900 text-red-200' :
                          task.priority === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-blue-900 text-blue-200'
                        }`}>
                           {task.priority}
                        </span>
                        <span className="text-xs text-slate-500">{new Date(task.createdAt).toLocaleDateString()}</span>
                     </div>
                     
                     <h3 className="font-bold text-white text-lg">{task.title}</h3>
                     <p className="text-sm text-slate-400 mb-4">{task.description || 'Sin descripción'}</p>
                     
                     <div className="mt-auto pt-4 border-t border-slate-700 flex justify-between items-center">
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                           <UserIcon className="w-3 h-3" />
                           {isAdmin ? `ID: ${task.assignedTo}` : 'Asignada a mí'}
                        </div>

                        {/* Controls */}
                        <div className="flex gap-2">
                           {task.status === 'pending' && (
                             <button 
                               onClick={() => updateStatus(task, 'in_progress')}
                               className="px-3 py-1 bg-slate-700 hover:bg-blue-600 text-white text-xs font-bold rounded transition-colors"
                             >
                                Iniciar
                             </button>
                           )}
                           {task.status === 'in_progress' && (
                             <button 
                               onClick={() => updateStatus(task, 'completed')}
                               className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors"
                             >
                                Terminar
                             </button>
                           )}
                           {task.status === 'completed' && (
                             <span className="flex items-center gap-1 text-emerald-500 font-bold text-xs uppercase">
                                <CheckCircle className="w-4 h-4" /> Listo
                             </span>
                           )}
                        </div>
                     </div>
                  </div>
                ))}
                
                {(!tasks || tasks.length === 0) && (
                   <div className="col-span-full text-center py-20 opacity-30">
                      <ListTodo className="w-20 h-20 mx-auto mb-4" />
                      <p className="text-xl font-bold">No hay tareas pendientes</p>
                   </div>
                )}
             </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default TaskBoard;

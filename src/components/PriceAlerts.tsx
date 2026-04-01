import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Plus, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  Power, 
  Trash2 
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import type { PriceAlert } from '../types';

export function PriceAlerts({ user, currentPrices }: { user: any; currentPrices: Record<string, number> }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [newAlert, setNewAlert] = useState<{ pair: string; condition: 'ABOVE' | 'BELOW'; value: string }>({
    pair: 'BTCUSD',
    condition: 'ABOVE',
    value: ''
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'alerts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PriceAlert[];
      setAlerts(records);
    });
    return () => unsubscribe();
  }, [user]);

  // Check for triggered alerts
  useEffect(() => {
    alerts.forEach(async (alert) => {
      if (!alert.isActive || alert.isTriggered) return;
      const currentPrice = currentPrices[alert.pair];
      if (!currentPrice) return;

      let triggered = false;
      if (alert.condition === 'ABOVE' && currentPrice >= alert.value) triggered = true;
      if (alert.condition === 'BELOW' && currentPrice <= alert.value) triggered = true;

      if (triggered) {
        try {
          await updateDoc(doc(db, 'alerts', alert.id!), {
            isTriggered: true,
            isActive: false
          });
          toast.success(`ALERT TRIGGERED: ${alert.pair} is ${alert.condition.toLowerCase()} ${alert.value}!`, {
            duration: 10000,
            icon: <Bell className="w-5 h-5 text-orange-500" />
          });
        } catch (err) {
          console.error("Failed to trigger alert:", err);
        }
      }
    });
  }, [currentPrices, alerts]);

  const handleAddAlert = async () => {
    if (!user || !newAlert.value) return;
    try {
      await addDoc(collection(db, 'alerts'), {
        userId: user.uid,
        pair: newAlert.pair,
        condition: newAlert.condition,
        value: parseFloat(newAlert.value),
        isActive: true,
        isTriggered: false,
        createdAt: serverTimestamp()
      });
      setNewAlert({ ...newAlert, value: '' });
      setIsAdding(false);
      toast.success("Alert created successfully!");
    } catch (err) {
      console.error("Failed to create alert:", err);
      toast.error("Failed to create alert.");
    }
  };

  const toggleAlert = async (alert: PriceAlert) => {
    try {
      await updateDoc(doc(db, 'alerts', alert.id!), {
        isActive: !alert.isActive,
        isTriggered: false
      });
    } catch (err) {
      console.error("Failed to toggle alert:", err);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'alerts', id));
      toast.success("Alert deleted.");
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-500" />
          Price Alerts
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <select 
              value={newAlert.pair}
              onChange={(e) => setNewAlert({ ...newAlert, pair: e.target.value })}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
            >
              {['XAUUSD', 'GBPJPY', 'GBPUSD', 'EURUSD', 'BTCUSD', 'ETHUSD'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select 
              value={newAlert.condition}
              onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value as 'ABOVE' | 'BELOW' })}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
            >
              <option value="ABOVE">Price Above</option>
              <option value="BELOW">Price Below</option>
            </select>
          </div>
          <input 
            type="number"
            placeholder="Target Price"
            value={newAlert.value}
            onChange={(e) => setNewAlert({ ...newAlert, value: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
          />
          <button 
            onClick={handleAddAlert}
            className="w-full py-2 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-colors"
          >
            Create Alert
          </button>
        </motion.div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-4">
            <BellOff className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">No active alerts</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id}
              className={cn(
                "p-4 rounded-2xl border transition-all flex items-center justify-between group",
                alert.isTriggered ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/10"
              )}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase text-gray-400">{alert.pair}</span>
                  {alert.isTriggered && (
                    <span className="px-2 py-0.5 bg-orange-500 text-[10px] font-bold rounded-full uppercase">Triggered</span>
                  )}
                </div>
                <p className="font-bold flex items-center gap-2">
                  {alert.condition === 'ABOVE' ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                  {alert.value.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleAlert(alert)}
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    alert.isActive ? "bg-orange-500 text-white" : "bg-white/10 text-gray-400 hover:text-white"
                  )}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteAlert(alert.id!)}
                  className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

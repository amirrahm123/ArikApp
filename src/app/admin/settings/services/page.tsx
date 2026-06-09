'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { blockDemoWrite, useIsDemo } from '@/lib/demo';
import Link from 'next/link';

interface ServiceRow {
  id: string;
  name: string;
  duration: number;
  price: number;
  active: boolean;
}

export default function ServicesSettingsPage() {
  const isDemo = useIsDemo();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editPrice, setEditPrice] = useState(0);
  const [editActive, setEditActive] = useState(true);

  // Add fields
  const [addName, setAddName] = useState('');
  const [addDuration, setAddDuration] = useState(30);
  const [addPrice, setAddPrice] = useState(0);

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });

    setServices((data as ServiceRow[]) || []);
    setLoading(false);
  };

  const startEdit = (s: ServiceRow) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditDuration(s.duration);
    setEditPrice(s.price);
    setEditActive(s.active);
  };

  const saveEdit = async () => {
    if (blockDemoWrite()) return;
    if (!editingId || !editName) return;
    await supabase.from('services').update({
      name: editName,
      duration: editDuration,
      price: editPrice,
      active: editActive,
    }).eq('id', editingId);
    setEditingId(null);
    loadServices();
  };

  const toggleActive = async (s: ServiceRow) => {
    if (blockDemoWrite()) return;
    await supabase.from('services').update({ active: !s.active }).eq('id', s.id);
    setServices((prev) => prev.map((sv) => sv.id === s.id ? { ...sv, active: !sv.active } : sv));
  };

  const handleAdd = async () => {
    if (blockDemoWrite()) return;
    if (!addName) return;
    await supabase.from('services').insert({
      name: addName,
      duration: addDuration,
      price: addPrice,
      active: true,
    });
    setShowAdd(false);
    setAddName('');
    setAddDuration(30);
    setAddPrice(0);
    loadServices();
  };

  const handleDelete = async (id: string, name: string) => {
    if (blockDemoWrite()) return;
    if (!confirm(`למחוק את השירות "${name}"?`)) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      alert('לא ניתן למחוק שירות שיש לו תורים קיימים');
      return;
    }
    loadServices();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/settings" className="text-sm text-muted hover:text-white">← הגדרות</Link>
          <h2 className="text-xl font-bold">✂️ שירותים</h2>
        </div>
        {!isDemo && (
          <button
            onClick={() => setShowAdd(true)}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            + הוסף שירות
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-surface rounded-xl p-4 border border-accent/30 mb-4 space-y-3">
          <h3 className="font-bold text-sm">שירות חדש</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">שם השירות</label>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="w-full bg-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-accent focus:outline-none"
                placeholder="תספורת..."
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">משך זמן (דקות)</label>
              <input
                type="number"
                value={addDuration}
                onChange={(e) => setAddDuration(Number(e.target.value))}
                className="w-full bg-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-accent focus:outline-none"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">מחיר (₪)</label>
              <input
                type="number"
                value={addPrice}
                onChange={(e) => setAddPrice(Number(e.target.value))}
                className="w-full bg-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-accent focus:outline-none"
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!addName} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              שמור
            </button>
            <button onClick={() => setShowAdd(false)} className="text-muted hover:text-white text-sm">ביטול</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : services.length === 0 ? (
        <p className="text-center text-muted py-16">אין שירותים. הוסף שירות ראשון.</p>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <div key={s.id} className={`bg-surface rounded-xl p-4 border border-white/5 ${!s.active ? 'opacity-50' : ''}`}>
              {editingId === s.id ? (
                /* Inline edit mode */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">שם</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">דקות</label>
                      <input type="number" value={editDuration} onChange={(e) => setEditDuration(Number(e.target.value))} className="w-full bg-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-accent focus:outline-none" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">מחיר ₪</label>
                      <input type="number" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} className="w-full bg-bg border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-accent focus:outline-none" dir="ltr" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-lg text-sm font-semibold">שמור</button>
                    <button onClick={() => setEditingId(null)} className="text-muted hover:text-white text-sm">ביטול</button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-muted">{s.duration} דקות · ₪{s.price}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isDemo ? (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        s.active
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}>
                        {s.active ? 'פעיל' : 'מושבת'}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleActive(s)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                            s.active
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}
                        >
                          {s.active ? 'פעיל' : 'מושבת'}
                        </button>
                        <button onClick={() => startEdit(s)} className="text-muted hover:text-white text-sm">✏️</button>
                        <button onClick={() => handleDelete(s.id, s.name)} className="text-red-400 hover:text-red-300 text-sm">🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

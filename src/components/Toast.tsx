import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let addToastGlobal: ((message: string, type: 'success' | 'error' | 'info') => void) | null = null;

export const toast = {
  success: (message: string) => addToastGlobal?.(message, 'success'),
  error: (message: string) => addToastGlobal?.(message, 'error'),
  info: (message: string) => addToastGlobal?.(message, 'info'),
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToastGlobal = (message: string, type: 'success' | 'error' | 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };
    return () => { addToastGlobal = null; };
  }, []);

  return (
    <div className="fixed top-20 right-4 z-[100] space-y-2 max-w-md">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className={`rounded-xl p-4 shadow-lg backdrop-blur-xl border cursor-pointer ${
              t.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' :
              t.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
              'bg-blue-500/90 border-blue-400 text-white'
            }`}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-xl">
                {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
              </div>
              <div className="text-sm font-medium">{t.message}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

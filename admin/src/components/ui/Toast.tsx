import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import useToastStore from '@/store/useToastStore';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const typeStyles = {
          success: { border: 'border-green-200', accent: 'bg-green-500', icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
          error: { border: 'border-red-200', accent: 'bg-red-500', icon: <AlertCircle className="h-5 w-5 text-red-500" /> },
          info: { border: 'border-gray-200', accent: 'bg-gray-400', icon: <Info className="h-5 w-5 text-gray-500" /> },
        };

        const { border, accent, icon } = typeStyles[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-xl border bg-white px-4 py-3 shadow-md ${border}`}
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
            <div className="flex-shrink-0 ml-1">{icon}</div>
            <p className="text-sm text-gray-800">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;

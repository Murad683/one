import React, { useState } from 'react';
import type { Deliverable } from '@/types';
import { DELIVERABLE_STATUS_CONFIG } from '@/utils/deliverable.helpers';
import { updateDeliverableStatus } from '@/api/deliverables.api';
import useToastStore from '@/store/useToastStore';

interface StatusSelectProps {
  deliverable: Deliverable;
  onStatusChange: (updated: Deliverable) => void;
}

const StatusSelect: React.FC<StatusSelectProps> = ({ deliverable, onStatusChange }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(deliverable.status);
  const { addToast } = useToastStore();

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    const previousStatus = currentStatus;
    
    setCurrentStatus(newStatus as Deliverable['status']);
    setIsUpdating(true);

    try {
      const res = await updateDeliverableStatus(deliverable.id, newStatus);
      onStatusChange(res.data);
      addToast('Status updated', 'success');
    } catch (err) {
      setCurrentStatus(previousStatus);
      addToast('Status update failed', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const config = DELIVERABLE_STATUS_CONFIG[currentStatus] || DELIVERABLE_STATUS_CONFIG['PENDING'];
  
  const variantStyles = {
    success: 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-yellow-500',
    error: 'bg-red-50 text-red-600 border-red-200 focus:ring-red-500',
    neutral: 'bg-gray-100 text-gray-700 border-transparent focus:ring-gray-500',
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentStatus}
        onChange={handleStatusChange}
        disabled={isUpdating}
        className={`cursor-pointer rounded-md border px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${
          variantStyles[config.variant]
        }`}
      >
        {Object.entries(DELIVERABLE_STATUS_CONFIG).map(([key, { label }]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      {isUpdating && (
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
      )}
    </div>
  );
};

export default StatusSelect;

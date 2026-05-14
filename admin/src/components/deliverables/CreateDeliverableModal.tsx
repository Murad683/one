import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { getClients } from '@/api/users.api';
import { createDeliverable } from '@/api/deliverables.api';
import { DELIVERABLE_TYPE_LABELS, MONTH_LABELS } from '@/utils/deliverable.helpers';
import useToastStore from '@/store/useToastStore';
import type { Deliverable, User } from '@/types';

interface CreateDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deliverable: Deliverable) => void;
}

type DeliverableFormData = {
  clientId: string;
  type: string;
  month: number;
  year: number;
  notes?: string;
};

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => {
  const y = currentYear - 3 + i;
  return { value: y.toString(), label: y.toString() };
});

const monthOptions = MONTH_LABELS.map((m, i) => ({
  value: (i + 1).toString(),
  label: m,
}));

const typeOptions = Object.entries(DELIVERABLE_TYPE_LABELS).map(([key, label]) => ({
  value: key,
  label,
}));

const CreateDeliverableModal: React.FC<CreateDeliverableModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [clients, setClients] = useState<User[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { addToast } = useToastStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeliverableFormData>();

  useEffect(() => {
    if (isOpen) {
      const fetchClients = async () => {
        setClientsLoading(true);
        try {
          const res = await getClients();
          setClients(res.data.items);
        } catch (err) {
          addToast('Failed to load clients', 'error');
        } finally {
          setClientsLoading(false);
        }
      };
      fetchClients();
      
      reset({
        clientId: '',
        type: '',
        month: new Date().getMonth() + 1,
        year: currentYear,
        notes: '',
      });
      setSubmitError(null);
    }
  }, [isOpen, reset, addToast]);

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.email})`,
  }));

  const onSubmit = async (data: DeliverableFormData) => {
    setSubmitError(null);
    try {
      const payload = {
        ...data,
        month: Number(data.month),
        year: Number(data.year),
      };
      const res = await createDeliverable(payload);
      addToast('Deliverable record created.', 'success');
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to create deliverable');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Deliverable" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {clientsLoading ? (
          <div className="text-sm text-muted">Loading clients...</div>
        ) : (
          <Select
            label="Client"
            options={[{ value: '', label: 'Select a client...' }, ...clientOptions]}
            {...register('clientId', { required: 'Client is required' })}
            error={errors.clientId?.message}
          />
        )}

        <Select
          label="Deliverable Type"
          options={[{ value: '', label: 'Select type...' }, ...typeOptions]}
          {...register('type', { required: 'Type is required' })}
          error={errors.type?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Month"
            options={monthOptions}
            {...register('month', { required: 'Month is required' })}
            error={errors.month?.message}
          />
          <Select
            label="Year"
            options={yearOptions}
            {...register('year', { required: 'Year is required' })}
            error={errors.year?.message}
          />
        </div>

        <Textarea
          label="Notes"
          placeholder="Internal notes for this delivery..."
          {...register('notes')}
          error={errors.notes?.message}
        />

        {submitError && (
          <div className="text-sm text-red-600">{submitError}</div>
        )}

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Record
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateDeliverableModal;

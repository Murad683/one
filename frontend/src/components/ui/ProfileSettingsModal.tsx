import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Instagram, Save, Loader2 } from 'lucide-react';
import { cinematicEasing } from '../../utils/animations';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileFormData {
  igUsername: string;
  igBio: string;
  igFollowers: string;
  igFollowing: string;
  igPostsCount: string;
  igProfilePic: string;
}

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<ProfileFormData>({
    igUsername: '',
    igBio: '',
    igFollowers: '',
    igFollowing: '',
    igPostsCount: '',
    igProfilePic: '',
  });

  // Pre-fill form with existing user data
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        igUsername: user.igUsername || '',
        igBio: user.igBio || '',
        igFollowers: user.igFollowers || '',
        igFollowing: user.igFollowing || '',
        igPostsCount: user.igPostsCount || '',
        igProfilePic: user.igProfilePic || '',
      });
      setError('');
      setSuccess('');
    }
  }, [isOpen, user]);

  // Escape key & scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.classList.add('lock-scroll');
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('lock-scroll');
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.patch('/auth/profile', {
        igUsername: formData.igUsername || null,
        igBio: formData.igBio || null,
        igFollowers: formData.igFollowers || null,
        igFollowing: formData.igFollowing || null,
        igPostsCount: formData.igPostsCount || null,
        igProfilePic: formData.igProfilePic || null,
      });

      await refreshUser();
      setSuccess('Profil uğurla yeniləndi!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      setError('Profil yenilənərkən xəta baş verdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--input-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--input-border)',
    color: 'var(--text-primary)',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={backdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[100] h-screen w-screen flex items-center justify-center backdrop-blur-sm px-4 sm:px-6"
          style={{ backgroundColor: 'var(--modal-backdrop)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: cinematicEasing }}
            className="backdrop-blur-2xl border rounded-2xl sm:rounded-3xl max-w-lg w-full p-0 relative overflow-hidden h-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl overscroll-contain"
            style={{
              backgroundColor: 'var(--modal-bg)',
              borderColor: 'var(--card-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-50 p-2 rounded-full backdrop-blur-md border transition-all cursor-pointer hover:bg-white/10"
              style={{
                color: 'var(--text-primary)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <X size={18} />
            </button>

            {/* Scrollable Content */}
            <div className="overflow-y-auto no-scrollbar p-7 sm:p-9 overscroll-contain">
              {/* Header */}
              <div className="flex items-center gap-3 mb-7">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: 'var(--glow-accent-subtle)' }}
                >
                  <Instagram size={20} style={{ color: 'var(--accent-text)' }} />
                </div>
                <div>
                  <h2
                    className="font-heading text-lg font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Profil Ayarları
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Instagram məlumatlarınızı yeniləyin
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Instagram Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider" style={labelStyle}>
                    İnstagram İstifadəçi Adı
                  </label>
                  <input
                    type="text"
                    name="igUsername"
                    value={formData.igUsername}
                    onChange={handleChange}
                    placeholder="@username"
                    disabled={isSubmitting}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors disabled:opacity-50"
                    style={inputStyle}
                  />
                </div>

                {/* Bio */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider" style={labelStyle}>
                    Bio
                  </label>
                  <textarea
                    name="igBio"
                    value={formData.igBio}
                    onChange={handleChange}
                    placeholder="Instagram bio mətnini daxil edin..."
                    rows={3}
                    disabled={isSubmitting}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors disabled:opacity-50 resize-none"
                    style={inputStyle}
                  />
                </div>

                {/* Followers & Following — side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium uppercase tracking-wider" style={labelStyle}>
                      İzləyicilər
                    </label>
                    <input
                      type="text"
                      name="igFollowers"
                      value={formData.igFollowers}
                      onChange={handleChange}
                      placeholder="12.5K"
                      disabled={isSubmitting}
                      className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors disabled:opacity-50"
                      style={inputStyle}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium uppercase tracking-wider" style={labelStyle}>
                      İzlənilənlər
                    </label>
                    <input
                      type="text"
                      name="igFollowing"
                      value={formData.igFollowing}
                      onChange={handleChange}
                      placeholder="500"
                      disabled={isSubmitting}
                      className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors disabled:opacity-50"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Posts Count */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider" style={labelStyle}>
                    Post Sayı
                  </label>
                  <input
                    type="text"
                    name="igPostsCount"
                    value={formData.igPostsCount}
                    onChange={handleChange}
                    placeholder="120"
                    disabled={isSubmitting}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors disabled:opacity-50"
                    style={inputStyle}
                  />
                </div>

                {/* Profile Picture URL */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider" style={labelStyle}>
                    Profil Şəkli URL
                  </label>
                  <input
                    type="text"
                    name="igProfilePic"
                    value={formData.igProfilePic}
                    onChange={handleChange}
                    placeholder="https://example.com/avatar.jpg"
                    disabled={isSubmitting}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors disabled:opacity-50"
                    style={inputStyle}
                  />
                </div>

                {/* Error / Success Messages */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5"
                  >
                    {error}
                  </motion.p>
                )}
                {success && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5"
                  >
                    {success}
                  </motion.p>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl text-sm font-medium border transition-all duration-200 hover:opacity-80 disabled:opacity-50 cursor-pointer"
                    style={{
                      color: 'var(--text-secondary)',
                      borderColor: 'var(--card-border)',
                      backgroundColor: 'transparent',
                    }}
                  >
                    Ləğv et
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-accent rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    style={{ color: 'var(--accent-on-accent)' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Yüklənir...
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        Yadda saxla
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ProfileSettingsModal;

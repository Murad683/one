import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';

interface LoginFormValues {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setError('');
      await login(values.email, values.password);
      const user = useAuthStore.getState().user;
      if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
        useAuthStore.getState().logout();
        setError('Yalnız admin istifadəçilər bu panelə daxil ola bilər.');
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Daxil olmaq mümkün olmadı. Məlumatlarınızı yoxlayın və yenidən cəhd edin.');
    }
  };

  if (token) return <Navigate to="/" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-hover px-4">
      <section className="w-full max-w-sm rounded-xl border border-edge bg-surface p-6 shadow-sm">
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="h-10 w-auto rounded-sm object-contain" />
            <h1 className="text-xl font-bold tracking-tighter text-heading">
              ONE<span className="text-blue-600">.</span>
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">Məzmun və müştəriləri idarə etmək üçün daxil olun.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="E-poçt"
            type="text"
            inputMode="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'E-poçt mütləqdir',
              pattern: { value: /^\S+@\S+$/i, message: 'Düzgün e-poçt ünvanı daxil edin' },
            })}
          />
          <Input
            label="Şifrə"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', { required: 'Şifrə mütləqdir' })}
          />

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Daxil ol
          </Button>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;

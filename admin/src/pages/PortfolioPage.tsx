import { useEffect, useMemo, useState } from 'react';
import { Edit2, ImageIcon, Plus, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Textarea from '../components/ui/Textarea';
import Toggle from '../components/ui/Toggle';
import Select from '../components/ui/Select';
import { api } from '../lib/api';
import { assetUrl, getYoutubeId, requestErrorMessage, uploadImage } from '../lib/apiHelpers';
import type { ApiEnvelope, Paginated } from '../lib/apiHelpers';

interface Category extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
}

interface Project extends Record<string, unknown> {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  youtubeId?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  categoryLegacy?: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  externalUrl?: string | null;
  year?: number | null;
  serviceTitle?: string | null;
  sortOrder: number;
}

interface ProjectFormValues {
  title: string;
  description: string;
  categoryId: string;
  thumbnailUrl: string;
  youtubeId: string;
  serviceTitle: string;
  year: number | null;
  externalUrl: string;
  isPublished: boolean;
  isFeatured: boolean;
}

const defaultProjectValues: ProjectFormValues = {
  title: '',
  description: '',
  categoryId: '',
  thumbnailUrl: '',
  youtubeId: '',
  serviceTitle: '',
  year: null,
  externalUrl: '',
  isPublished: true,
  isFeatured: false,
};

export const PortfolioPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [renamingId, setRenamingId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormValues>({ defaultValues: defaultProjectValues });

  const watchedPublished = watch('isPublished');
  const watchedFeatured = watch('isFeatured');

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [categoriesRes, projectsRes] = await Promise.all([
        api.get<Category[]>('/categories'),
        api.get<ApiEnvelope<Paginated<Project>>>('/projects?includeInactive=true&limit=100'),
      ]);
      setCategories(categoriesRes.data);
      setProjects(projectsRes.data.data.items);
    } catch (err) {
      setError(requestErrorMessage(err, 'Məlumatlar yüklənə bilmədi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'Kateqoriya yoxdur' },
      ...categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories],
  );

  const openProjectModal = (project?: Project) => {
    setEditingProject(project || null);
    setSelectedFile(null);
    setPreviewUrl(assetUrl(project?.thumbnailUrl));
    reset(
      project
        ? {
            title: project.title,
            description: project.description,
            categoryId: project.categoryId || '',
            thumbnailUrl: project.thumbnailUrl || '',
            youtubeId: project.youtubeId || '',
            serviceTitle: project.serviceTitle || '',
            year: project.year ?? null,
            externalUrl: project.externalUrl || '',
            isPublished: project.isPublished,
            isFeatured: project.isFeatured,
          }
        : defaultProjectValues,
    );
    setIsProjectModalOpen(true);
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const submitProject = async (values: ProjectFormValues) => {
    setIsSaving(true);
    try {
      let thumbnailUrl = values.thumbnailUrl || null;
      if (selectedFile) {
        const upload = await uploadImage(selectedFile, 'thumbnails');
        thumbnailUrl = upload.fileUrl;
      }

      const payload = {
        title: values.title,
        description: values.description,
        categoryId: values.categoryId || null,
        thumbnailUrl,
        youtubeId: getYoutubeId(values.youtubeId),
        serviceTitle: values.serviceTitle || null,
        year: values.year ? Number(values.year) : null,
        externalUrl: values.externalUrl || null,
        isPublished: values.isPublished,
        isFeatured: values.isFeatured,
      };

      if (editingProject) {
        await api.patch(`/projects/${editingProject.id}`, payload);
      } else {
        await api.post('/projects', payload);
      }

      setIsProjectModalOpen(false);
      await fetchData();
    } catch (err) {
      setError(requestErrorMessage(err, 'Layihə yadda saxlanıla bilmədi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await api.post('/categories', { name: newCategory.trim() });
    setNewCategory('');
    await fetchData();
  };

  const saveRename = async (category: Category) => {
    if (!renameValue.trim()) return;
    await api.patch(`/categories/${category.id}`, { name: renameValue.trim() });
    setRenamingId('');
    setRenameValue('');
    await fetchData();
  };

  const updateProjectToggle = async (project: Project, field: 'isFeatured' | 'isPublished', value: boolean) => {
    setProjects((current) =>
      current.map((item) => (item.id === project.id ? { ...item, [field]: value } : item)),
    );
    try {
      await api.patch(`/projects/${project.id}`, { [field]: value });
      await fetchData();
    } catch (err) {
      setError(requestErrorMessage(err, 'Status yenilənə bilmədi.'));
      await fetchData();
    }
  };

  const columns: TableColumn<Project>[] = [
    {
      key: 'thumbnailUrl',
      header: 'Şəkil',
      render: (project) =>
        project.thumbnailUrl ? (
          <img src={assetUrl(project.thumbnailUrl)} alt="" className="h-12 w-16 rounded object-cover" />
        ) : (
          <div className="flex h-12 w-16 items-center justify-center rounded bg-slate-100 text-slate-400">
            <ImageIcon className="h-5 w-5" />
          </div>
        ),
    },
    { key: 'title', header: 'Başlıq' },
    {
      key: 'category',
      header: 'Kateqoriya',
      render: (project) => project.category?.name || project.categoryLegacy || 'Kateqoriya yoxdur',
    },
    {
      key: 'isFeatured',
      header: 'Seçilmiş',
      render: (project) => (
        <Toggle
          checked={project.isFeatured}
          onChange={(checked) => updateProjectToggle(project, 'isFeatured', checked)}
        />
      ),
    },
    {
      key: 'isPublished',
      header: 'Dərc edilib',
      render: (project) => (
        <Toggle
          checked={project.isPublished}
          onChange={(checked) => updateProjectToggle(project, 'isPublished', checked)}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Əməliyyatlar',
      render: (project) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openProjectModal(project)} aria-label="Layihəni redaktə et">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteProject(project)} aria-label="Layihəni sil">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Kateqoriyalar</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <div key={category.id} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200">
              {renamingId === category.id ? (
                <>
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveRename(category);
                      if (event.key === 'Escape') setRenamingId('');
                    }}
                    className="w-32 rounded border border-slate-300 px-2 py-1 text-sm outline-none"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveRename(category)}>
                    Yadda Saxla
                  </Button>
                </>
              ) : (
                <>
                  <span>{category.name}</span>
                  <button type="button" onClick={() => { setRenamingId(category.id); setRenameValue(category.name); }}>
                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                  <button type="button" onClick={() => setDeleteCategory(category)}>
                    <X className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex max-w-md gap-2 w-full">
          <Input
            aria-label="Yeni kateqoriya"
            placeholder="Kateqoriya adı..."
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addCategory();
            }}
            className="flex-1"
          />
          <Button onClick={addCategory} className="shrink-0">
            <Plus className="h-4 w-4" />
            Əlavə Et
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-950">Layihələr</h2>
          <Button onClick={() => openProjectModal()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Yeni Layihə
          </Button>
        </div>
        <Table columns={columns} data={projects} isLoading={isLoading} emptyMessage="Layihə tapılmadı." />
      </section>

      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title={editingProject ? 'Layihəni Redaktə Et' : 'Yeni Layihə Əlavə Et'}
        size="xl"
      >
        <form onSubmit={handleSubmit(submitProject)} className="space-y-4">
          <Input label="Başlıq" error={errors.title?.message} {...register('title', { required: 'Başlıq mütləqdir' })} />
          <Select label="Kateqoriya" options={categoryOptions} {...register('categoryId')} />
          <div className="space-y-2">
            <Input
              label="Şəkil (Thumbnail)"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleFileChange(event.target.files?.[0])}
            />
            {previewUrl && <img src={previewUrl} alt="" className="h-28 w-40 rounded-lg object-cover" />}
          </div>
          <Input label="YouTube ID və ya Link" {...register('youtubeId')} />
          <Textarea label="Təsvir" error={errors.description?.message} {...register('description', { required: 'Təsvir mütləqdir' })} />
          <Input label="Xidmət növü" {...register('serviceTitle')} placeholder="Məs: Video Çəkiliş" />
          <Input label="İl" type="number" {...register('year', { valueAsNumber: true })} />
          <Input label="Xarici Link" {...register('externalUrl')} />
          <Toggle checked={watchedPublished} onChange={(checked) => setValue('isPublished', checked)} label="Dərc edilsin" />
          <Toggle checked={watchedFeatured} onChange={(checked) => setValue('isFeatured', checked)} label="Ana səhifədə göstərilsin" />
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => setIsProjectModalOpen(false)} disabled={isSaving}>
              Ləğv Et
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Yadda Saxla
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteCategory)}
        onClose={() => setDeleteCategory(null)}
        onConfirm={async () => {
          if (!deleteCategory) return;
          await api.delete(`/categories/${deleteCategory.id}`);
          setDeleteCategory(null);
          await fetchData();
        }}
        title="Kateqoriyanı sil"
        message="Bu kateqoriyaya aid bütün layihələr kateqoriyasız qalacaq."
      />

      <ConfirmDialog
        isOpen={Boolean(deleteProject)}
        onClose={() => setDeleteProject(null)}
        onConfirm={async () => {
          if (!deleteProject) return;
          await api.delete(`/projects/${deleteProject.id}`);
          setDeleteProject(null);
          await fetchData();
        }}
        title="Layihəni sil"
        message="Bu layihə həmişəlik silinəcək."
      />
    </div>
  );
};

export default PortfolioPage;

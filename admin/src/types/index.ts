export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CLIENT';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  youtubeId?: string | null;
  category: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  iconName?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string | null;
  avatarUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Deliverable {
  id: string;
  clientId: string;
  client: Pick<User, 'id' | 'name' | 'email'>;
  type: 'VIDEO_1' | 'VIDEO_2' | 'DESIGNS' | 'OTHER';
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'ARCHIVED';
  month: number;
  year: number;
  fileUrl?: string | null;
  fileSize?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  notes?: string | null;
  uploadedAt?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string | null; // From the secure URL service
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: unknown;
}

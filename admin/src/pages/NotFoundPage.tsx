import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export const NotFoundPage = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold tracking-tight text-heading">404</p>
      <div>
        <p className="text-lg font-medium text-body">Səhifə tapılmadı</p>
        <p className="mt-1 text-sm text-muted">
          Bu ünvan idarəetmə panelində yoxdur və ya köçürülüb.
        </p>
      </div>
      <Link to="/">
        <Button>İdarəetmə Panelinə qayıt</Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;

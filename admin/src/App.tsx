import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RequireAuth, RequireAdmin } from './components/guards/RequireAuth';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { ServicesPage } from './pages/ServicesPage';
import { PackagesPage } from './pages/PackagesPage';
import { TeamPage } from './pages/TeamPage';
import { UsersPage } from './pages/UsersPage';
import { DeliverablesPage } from './pages/DeliverablesPage';
import { SettingsPage } from './pages/SettingsPage';
import { MessagesPage } from './pages/MessagesPage';
import { TicketsPage } from './pages/TicketsPage';
import { AddPaymentPage } from './pages/AddPaymentPage';
import { AdminManagementPage } from './pages/AdminManagementPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/unauthorized', element: <div className="p-6">Giriş qadağandır</div> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireAdmin />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/portfolio', element: <PortfolioPage /> },
              { path: '/services', element: <ServicesPage /> },
              { path: '/packages', element: <PackagesPage /> },
              { path: '/team-members', element: <TeamPage /> },
              { path: '/team', element: <AdminManagementPage /> },
              { path: '/users', element: <UsersPage /> },
              { path: '/deliverables', element: <DeliverablesPage /> },
              { path: '/messages', element: <MessagesPage /> },
              { path: '/tickets', element: <TicketsPage /> },
              { path: '/payments/new', element: <AddPaymentPage /> },
              { path: '/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

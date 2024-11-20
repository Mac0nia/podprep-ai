import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import GuestResearch from '../pages/GuestResearch';
import ShowNotes from '../pages/ShowNotes';
import ContentRepurposing from '../pages/ContentRepurposing';
import Analytics from '../pages/Analytics';
import Settings from '../pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'guests',
        element: <GuestResearch />,
      },
      {
        path: 'notes',
        element: <ShowNotes />,
      },
      {
        path: 'content',
        element: <ContentRepurposing />,
      },
      {
        path: 'analytics',
        element: <Analytics />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);

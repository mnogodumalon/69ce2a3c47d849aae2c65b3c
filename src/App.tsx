import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import UnternehmenPage from '@/pages/UnternehmenPage';
import VerpackungstypenPage from '@/pages/VerpackungstypenPage';
import NachweisePage from '@/pages/NachweisePage';
import RegelstatusPage from '@/pages/RegelstatusPage';
import KennzahlenPage from '@/pages/KennzahlenPage';
import VerpackungErfassenPage from '@/pages/intents/VerpackungErfassenPage';
import JahresberichtErfassenPage from '@/pages/intents/JahresberichtErfassenPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="unternehmen" element={<UnternehmenPage />} />
              <Route path="verpackungstypen" element={<VerpackungstypenPage />} />
              <Route path="nachweise" element={<NachweisePage />} />
              <Route path="regelstatus" element={<RegelstatusPage />} />
              <Route path="kennzahlen" element={<KennzahlenPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="intents/verpackung-erfassen" element={<VerpackungErfassenPage />} />
              <Route path="intents/jahresbericht-erfassen" element={<JahresberichtErfassenPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}

import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import VerpackungstypenPage from '@/pages/VerpackungstypenPage';
import NachweisePage from '@/pages/NachweisePage';
import RegelstatusPage from '@/pages/RegelstatusPage';
import UnternehmenPage from '@/pages/UnternehmenPage';
import KennzahlenPage from '@/pages/KennzahlenPage';
import PublicFormVerpackungstypen from '@/pages/public/PublicForm_Verpackungstypen';
import PublicFormNachweise from '@/pages/public/PublicForm_Nachweise';
import PublicFormRegelstatus from '@/pages/public/PublicForm_Regelstatus';
import PublicFormUnternehmen from '@/pages/public/PublicForm_Unternehmen';
import PublicFormKennzahlen from '@/pages/public/PublicForm_Kennzahlen';
// <public:imports>
// </public:imports>
// <custom:imports>
import VerpackungErfassenPage from '@/pages/intents/VerpackungErfassenPage';
import JahresberichtErfassenPage from '@/pages/intents/JahresberichtErfassenPage';
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/69ce2a16a11c5c94e64a8724" element={<PublicFormVerpackungstypen />} />
              <Route path="public/69ce2a186fb9551311abbd7f" element={<PublicFormNachweise />} />
              <Route path="public/69ce2a18409773a38eb18808" element={<PublicFormRegelstatus />} />
              <Route path="public/69ce2a10b74844016addd82e" element={<PublicFormUnternehmen />} />
              <Route path="public/69ce2a19555564c40eccb02c" element={<PublicFormKennzahlen />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="verpackungstypen" element={<VerpackungstypenPage />} />
                <Route path="nachweise" element={<NachweisePage />} />
                <Route path="regelstatus" element={<RegelstatusPage />} />
                <Route path="unternehmen" element={<UnternehmenPage />} />
                <Route path="kennzahlen" element={<KennzahlenPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
              <Route path="intents/verpackung-erfassen" element={<VerpackungErfassenPage />} />
              <Route path="intents/jahresbericht-erfassen" element={<JahresberichtErfassenPage />} />
            {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TodayPage } from './pages/TodayPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { MedicationFormPage } from './pages/MedicationFormPage';
import { AuditPage } from './pages/AuditPage';

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/medicaments" element={<MedicationsPage />} />
          <Route path="/medicaments/nouveau" element={<MedicationFormPage />} />
          <Route path="/medicaments/:id" element={<MedicationFormPage />} />
          <Route path="/journal" element={<AuditPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

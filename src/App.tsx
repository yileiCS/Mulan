import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import VoiceInputPage from '@/pages/VoiceInputPage';
import TextInputPage from '@/pages/TextInputPage';
import CreationPage from '@/pages/CreationPage';
import PoemsPage from '@/pages/PoemsPage';
import PoemDetailPage from '@/pages/PoemDetailPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="font-sans">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/voice-input" element={<VoiceInputPage />} />
          <Route path="/text-input" element={<TextInputPage />} />
          <Route path="/creation/:draftId" element={<CreationPage />} />
          <Route path="/poems" element={<PoemsPage />} />
          <Route path="/poem/:draftId" element={<PoemDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

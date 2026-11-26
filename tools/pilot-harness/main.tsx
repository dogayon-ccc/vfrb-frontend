import '../../src/main.css';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PilotStudio from '../../src/pages/client/PilotStudio';

createRoot(document.getElementById('root')!).render(<MemoryRouter><PilotStudio /></MemoryRouter>);

import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router/routes';

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;

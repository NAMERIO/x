import { useEffect, useState } from 'react';

import { getHealth } from './lib/api';

type ApiStatus = 'checking' | 'online' | 'offline';

export function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();

    void getHealth(controller.signal)
      .then(() => setApiStatus('online'))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiStatus('offline');
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="shell">
      <section className="card" aria-labelledby="page-title">
        <p className="eyebrow">Foundation ready</p>
        <h1 id="page-title">X communication platform</h1>
        <p className="summary">
          The client, server, and shared contracts are connected. Product
          features will be added in later stages.
        </p>
        <div className="status" role="status" aria-live="polite">
          <span className={`indicator indicator--${apiStatus}`} />
          API {apiStatus}
        </div>
      </section>
    </main>
  );
}

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ApiError, api } from './lib/api';
import { ErrorBoundary, FullPageMessage } from './components/ErrorBoundary';
import { Spinner } from './components/ui';

const GuestApp = lazy(() => import('./guest/GuestApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <Spinner className="h-7 w-7 text-neutral-400" />
    </div>
  );
}

/** "/" sends guests to the default published hotel. */
function RootRedirect() {
  const q = useQuery({ queryKey: ['default-hotel'], queryFn: () => api<{ slug: string | null }>('/public/default-hotel') });
  if (q.isLoading) return <PageLoader />;
  if (q.data?.slug) return <Navigate to={`/h/${q.data.slug}${window.location.search}`} replace />;
  return <FullPageMessage code="404" title="No hotel is published yet" description="Sign in to the admin to publish your hotel." action={{ href: '/admin', label: 'Go to admin' }} />;
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/h/:slug/*" element={<GuestApp />} />
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="*" element={<FullPageMessage code="404" title="Page not found" description="The page you are looking for does not exist." action={{ href: '/', label: 'Go home' }} />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

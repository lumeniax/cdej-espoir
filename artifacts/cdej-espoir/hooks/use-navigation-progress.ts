import { useEffect } from 'react';
import { useLocation } from 'wouter';
import NProgress from 'nprogress';

export function useNavigationProgress() {
  const [location] = useLocation();

  useEffect(() => {
    NProgress.start();
    const timer = setTimeout(() => {
      NProgress.done();
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [location]);
}
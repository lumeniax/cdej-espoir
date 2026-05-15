import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import NProgress from "nprogress";

NProgress.configure({ showSpinner: false, trickleSpeed: 120 });

/**
 * Affiche une fine barre de progression en haut de page à chaque navigation
 * interne. La toute première navigation (montage initial) est ignorée pour
 * éviter qu'un flash apparaisse au chargement de l'app.
 */
export function useNavigationProgress() {
  const [location] = useLocation();
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    NProgress.start();
    const timer = setTimeout(() => {
      NProgress.done();
    }, 250);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [location]);
}

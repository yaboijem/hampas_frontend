import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, type Location } from 'react-router-dom';

const EXIT_MS = 180;

type Props = {
  children: (location: Location) => ReactNode;
};

export default function PageTransition({ children }: Props) {
  const location = useLocation();
  const [renderLocation, setRenderLocation] = useState(location);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (
      location.pathname === renderLocation.pathname &&
      location.search === renderLocation.search &&
      location.hash === renderLocation.hash
    ) {
      return;
    }
    setExiting(true);
    const id = window.setTimeout(() => {
      setRenderLocation(location);
      setExiting(false);
    }, EXIT_MS);
    return () => window.clearTimeout(id);
  }, [location, renderLocation.pathname, renderLocation.search, renderLocation.hash]);

  const isAuth =
    renderLocation.pathname === '/login' || renderLocation.pathname === '/register';
  const phaseClass = exiting
    ? 'page-fade-exit'
    : isAuth
      ? 'page-auth-enter'
      : 'page-fade-enter';

  return <div className={phaseClass}>{children(renderLocation)}</div>;
}

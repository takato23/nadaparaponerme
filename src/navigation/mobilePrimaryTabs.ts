import { ROUTES } from '../routes';

export type MobilePrimaryTabId = 'home' | 'closet' | 'looks' | 'community' | 'profile';

export interface MobilePrimaryTab {
  id: MobilePrimaryTabId;
  icon: string;
  label: string;
  path: string;
  tourId?: string;
}

export const MOBILE_PRIMARY_TABS: MobilePrimaryTab[] = [
  { id: 'home', icon: 'wb_sunny', label: 'Hoy', path: ROUTES.HOME },
  { id: 'closet', icon: 'checkroom', label: 'Armario', path: ROUTES.CLOSET, tourId: 'closet' },
  { id: 'looks', icon: 'style', label: 'Looks', path: ROUTES.SAVED },
  { id: 'community', icon: 'groups', label: 'Comunidad', path: ROUTES.COMMUNITY },
  { id: 'profile', icon: 'person', label: 'Perfil', path: ROUTES.PROFILE },
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const isPrimaryTabRouteActive = (pathname: string, itemPath: string) => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const normalizedItemPath = itemPath.replace(/\/+$/, '') || '/';

  if (normalizedItemPath === ROUTES.HOME) {
    return normalizedPath === ROUTES.HOME;
  }

  return normalizedPath === normalizedItemPath || normalizedPath.startsWith(`${normalizedItemPath}/`);
};

export const isPrimaryShellRoute = (pathname: string) => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return MOBILE_PRIMARY_TABS.some((tab) => normalizedPath === tab.path);
};

export const getPrimaryTabIndex = (pathname: string) => {
  const index = MOBILE_PRIMARY_TABS.findIndex((tab) => isPrimaryTabRouteActive(pathname, tab.path));
  return Math.max(0, index);
};

export const applyProgressResistance = (value: number, min: number, max: number) => {
  if (value < min) {
    return min - ((min - value) * 0.32);
  }

  if (value > max) {
    return max + ((value - max) * 0.32);
  }

  return value;
};

export const resolveSnapTargetIndex = ({
  committedIndex,
  progress,
  velocityPxPerMs,
  unitWidth,
  maxIndex,
}: {
  committedIndex: number;
  progress: number;
  velocityPxPerMs: number;
  unitWidth: number;
  maxIndex: number;
}) => {
  const delta = progress - committedIndex;
  const velocityPagesPerMs = unitWidth > 0 ? velocityPxPerMs / unitWidth : 0;
  const projectedProgress = progress + (velocityPagesPerMs * 220);

  if (Math.abs(delta) < 0.12 && Math.abs(velocityPxPerMs) < 0.35) {
    return committedIndex;
  }

  if (Math.abs(delta) > 0.48 || Math.abs(velocityPxPerMs) > 0.55) {
    return clamp(Math.round(projectedProgress), 0, maxIndex);
  }

  return clamp(Math.round(progress), 0, maxIndex);
};

export const clampPrimaryTabIndex = (value: number) =>
  clamp(value, 0, MOBILE_PRIMARY_TABS.length - 1);

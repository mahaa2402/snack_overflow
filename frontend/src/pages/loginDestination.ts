import { Role } from '../types/auth';

export const getLoginDestination = (role: Role, requestedPath?: string): string => {
  const isAdminPath = requestedPath === '/admin' || requestedPath?.startsWith('/admin/') === true;

  if (requestedPath && (role === 'ADMIN' || !isAdminPath)) {
    return requestedPath;
  }

  return role === 'ADMIN' ? '/admin' : '/';
};

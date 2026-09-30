import { useMemo, type ReactNode } from 'react';
import { GreenApiContext } from './GreenApiContext';
import { createGreenApiClient } from './greenApiClient';
import type { Credentials } from './types';

interface GreenApiProviderProps {
  credentials: Credentials;
  children: ReactNode;
}

export function GreenApiProvider({ credentials, children }: GreenApiProviderProps) {
  const client = useMemo(() => createGreenApiClient(credentials), [credentials]);
  return <GreenApiContext value={client}>{children}</GreenApiContext>;
}

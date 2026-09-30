import { createContext, use } from 'react';
import type { GreenApiClient } from './greenApiClient';

export const GreenApiContext = createContext<GreenApiClient | null>(null);

export function useGreenApi(): GreenApiClient {
  const client = use(GreenApiContext);
  if (!client) throw new Error('useGreenApi должен использоваться внутри <GreenApiProvider>');
  return client;
}

import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { GreenApiContext } from '../api/GreenApiContext';
import type { GreenApiClient } from '../api/greenApiClient';

export function renderWithClient(ui: ReactElement, client: GreenApiClient) {
  return render(<GreenApiContext value={client}>{ui}</GreenApiContext>);
}

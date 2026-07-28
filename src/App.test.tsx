import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock Recharts ResponsiveContainer to prevent size calculation errors in JSDOM
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual<any>('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: '800px', height: '250px' }}>{children}</div>
    ),
  };
});

describe('App Tabs', () => {
  it('renders Overview tab by default and switches tabs correctly', () => {
    render(<App />);
    
    // Overview tab content should be visible (e.g. Effective Rates)
    expect(screen.getByText('Effective Tax Rate')).toBeDefined();
    
    // Tax Details tab content should NOT be visible
    expect(screen.queryByText('Income Tax Breakdown')).toBeNull();

    // Click on Tax Details tab
    const taxTab = screen.getByRole('button', { name: 'Tax Details' });
    fireEvent.click(taxTab);
    
    // Now Tax Breakdown should be visible
    expect(screen.getByText('Income Tax Breakdown')).toBeDefined();
    
    // And Overview content should be hidden
    expect(screen.queryByText('Effective Tax Rate')).toBeNull();

    // Provide a pension contribution so PensionSummaryCard renders its projection
    const pensionInput = screen.getByLabelText('Pension Contribution (salary sacrifice)');
    fireEvent.change(pensionInput, { target: { value: '5000' } });

    // Click on Pension tab
    const pensionTab = screen.getByRole('button', { name: 'Pension' });
    fireEvent.click(pensionTab);

    // Pension projection should be visible
    expect(screen.getByText('Pension Projection')).toBeDefined();
    // Tax Breakdown should be hidden
    expect(screen.queryByText('Income Tax Breakdown')).toBeNull();

    // Click on Scenarios tab
    const scenariosTab = screen.getByRole('button', { name: 'Scenarios' });
    fireEvent.click(scenariosTab);

    // Baseline Actions should be visible
    expect(screen.getByText('Save as Baseline')).toBeDefined();
    // Pension should be hidden
    expect(screen.queryByText('Pension Projection')).toBeNull();
  });
});

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

    const isVisible = (el: HTMLElement) => {
      let current: HTMLElement | null = el;
      while(current) {
        if(current.style && current.style.display === 'none') return false;
        current = current.parentElement;
      }
      return true;
    };
    
    // Overview tab content should be visible (e.g. Effective Rates)
    expect(isVisible(screen.getByText('Effective Tax Rate'))).toBe(true);
    
    // Tax Details tab content should NOT be visible
    expect(isVisible(screen.getByText('Income Tax Breakdown'))).toBe(false);

    // Click on Tax Details tab
    const taxTab = screen.getByRole('button', { name: 'Tax Details' });
    fireEvent.click(taxTab);
    
    // Now Tax Breakdown should be visible
    expect(isVisible(screen.getByText('Income Tax Breakdown'))).toBe(true);
    
    // And Overview content should be hidden
    expect(isVisible(screen.getByText('Effective Tax Rate'))).toBe(false);

    // Provide a pension contribution so PensionSummaryCard renders its projection
    const pensionInput = screen.getByLabelText('Pension Contribution (salary sacrifice)');
    fireEvent.change(pensionInput, { target: { value: '5000' } });

    // Click on Pension tab
    const pensionTab = screen.getByRole('button', { name: 'Pension' });
    fireEvent.click(pensionTab);

    // Pension projection should be visible
    expect(isVisible(screen.getByText('Pension Projection'))).toBe(true);
    // Tax Breakdown should be hidden
    expect(isVisible(screen.getByText('Income Tax Breakdown'))).toBe(false);

    // Click on Scenarios tab
    const scenariosTab = screen.getByRole('button', { name: 'Scenarios' });
    fireEvent.click(scenariosTab);

    // Baseline Actions should be visible
    expect(isVisible(screen.getByText('Save as Baseline'))).toBe(true);
    // Pension should be hidden
    expect(isVisible(screen.getByText('Pension Projection'))).toBe(false);
  });
});

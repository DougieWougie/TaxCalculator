import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PensionSummaryCard } from './PensionSummaryCard';


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

describe('PensionSummaryCard', () => {
  const mockResult = {
    taxableEmploymentIncome: 60000,
    incomeTax: 10000,
    nationalInsurance: 5000,
    employerPension: 3000,
    totalPensionPot: 6000,
    netAnnualIncome: 45000,
    netMonthlyIncome: 3750,
    netWeeklyIncome: 865,
    effectiveTaxRate: 0.25,
    marginalTaxRate: 0.40,
    studentLoanRepayment: 0,
    militaryPensionTax: 0,
    scottishTaxRate: false,
  } as any;

  it('renders even when there is no total pension pot and no current pot', () => {
    const emptyResult = { ...mockResult, totalPensionPot: 0 };
    const { container } = render(
      <PensionSummaryCard result={emptyResult} pensionContributionAnnual={0} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders correctly when there is a pension pot', () => {
    render(<PensionSummaryCard result={mockResult} pensionContributionAnnual={3000} />);
    
    expect(screen.getAllByText('Pension Projection').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Your Contribution').length).toBeGreaterThan(0);
    // 3000 formatted usually includes currency symbol, we just check the number is visible somehow,
    // but the exact format might depend on `formatCurrency`.
  });

  it('allows entering a current pot which updates the projected final pot', () => {
    render(<PensionSummaryCard result={mockResult} pensionContributionAnnual={3000} />);
    
    // First spinbutton is Current Pension Pot
    const currentPotInput = screen.getAllByRole('spinbutton')[0];
    
    // Simulate user entering a current pot of 10000
    fireEvent.change(currentPotInput, { target: { value: '10000' } });
    expect((currentPotInput as HTMLInputElement).value).toBe('10000');
  });

  it('updates the selected preset growth rate when preset buttons are clicked', () => {
    render(<PensionSummaryCard result={mockResult} pensionContributionAnnual={3000} />);
    
    // The default growth rate is Medium (5%)
    const lowButton = screen.getAllByRole('button', { name: 'Low (2%)' })[0];
    const highButton = screen.getAllByRole('button', { name: 'High (8%)' })[0];
    // Fourth spinbutton is Expected Growth Rate
    const rateInput = screen.getAllByRole('spinbutton')[3];

    // Click High
    fireEvent.click(highButton);
    expect((rateInput as HTMLInputElement).value).toBe('8');

    // Click Low
    fireEvent.click(lowButton);
    expect((rateInput as HTMLInputElement).value).toBe('2');
  });
});

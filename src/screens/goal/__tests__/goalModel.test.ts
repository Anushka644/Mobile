import { GOAL_NAME_MAX, goalAmountInvalid, goalAmountText, parseGoalInput } from '../goalModel';

describe('parseGoalInput', () => {
  it('needs a name and a positive amount', () => {
    expect(parseGoalInput(' Tokyo   trip ', '2,500')).toEqual({ name: 'Tokyo trip', targetCents: 250000 });
    expect(parseGoalInput(' Weekend in Lisbon ', '1,200')).toEqual({ name: 'Weekend in Lisbon', targetCents: 120000 });
    expect(parseGoalInput('Bike', '899.99')).toEqual({ name: 'Bike', targetCents: 89999 });
    expect(parseGoalInput('', '100')).toBeNull();
    expect(parseGoalInput('  ', '100')).toBeNull();
    expect(parseGoalInput('Bike', '')).toBeNull();
    expect(parseGoalInput('Bike', '0')).toBeNull();
    expect(parseGoalInput('Bike', 'abc')).toBeNull();
  });

  it('keeps names up to the one shared limit (a 41–60 character goal survives either tab)', () => {
    const fifty = 'x'.repeat(50);
    expect(parseGoalInput(fifty, '10')?.name).toBe(fifty);
    expect(parseGoalInput('x'.repeat(80), '10')?.name).toHaveLength(GOAL_NAME_MAX);
  });
});

describe('goal amount field', () => {
  it('flags only a non-empty, non-positive amount', () => {
    expect(goalAmountInvalid('')).toBe(false);
    expect(goalAmountInvalid('1,200')).toBe(false);
    expect(goalAmountInvalid('0')).toBe(true);
    expect(goalAmountInvalid('abc')).toBe(true);
  });

  it('prefills the amount field', () => {
    expect(goalAmountText(120000)).toBe('1200');
    expect(goalAmountText(120050)).toBe('1200.50');
    expect(goalAmountText(8950)).toBe('89.50');
    expect(goalAmountText(undefined)).toBe('');
  });
});

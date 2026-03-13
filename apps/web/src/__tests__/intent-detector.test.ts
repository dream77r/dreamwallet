import { describe, it, expect } from 'vitest';
import { detectIntentFast } from '@dreamwallet/shared';

describe('detectIntentFast', () => {
  it('detects show_balance from "покажи баланс"', () => {
    const r = detectIntentFast('покажи баланс');
    expect(r.intent).toBe('show_balance');
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('detects show_balance from "сколько денег"', () => {
    expect(detectIntentFast('сколько денег').intent).toBe('show_balance');
  });

  it('detects show_last from "последние транзакции"', () => {
    expect(detectIntentFast('последние транзакции').intent).toBe('show_last');
  });

  it('detects show_last from "покажи крайние операции"', () => {
    expect(detectIntentFast('покажи крайние операции').intent).toBe('show_last');
  });

  it('detects show_goals from "мои цели"', () => {
    expect(detectIntentFast('мои цели').intent).toBe('show_goals');
  });

  it('detects show_budgets from "покажи бюджеты"', () => {
    expect(detectIntentFast('покажи бюджеты').intent).toBe('show_budgets');
  });

  it('detects create_budget with amount', () => {
    const r = detectIntentFast('создай бюджет 50000 на еду');
    expect(r.intent).toBe('create_budget');
    expect(r.params.amount).toBe(50000);
    expect(r.params.category).toBe('еду');
  });

  it('detects show_expenses with period', () => {
    const r = detectIntentFast('сколько потратил за неделю');
    expect(r.intent).toBe('show_expenses');
    expect(r.params.period).toBe('неделю');
  });

  it('detects show_expenses from "расходы за месяц"', () => {
    const r = detectIntentFast('расходы за месяц');
    expect(r.intent).toBe('show_expenses');
    expect(r.params.period).toBe('месяц');
  });

  it('detects show_category_spend from "сколько на продукты"', () => {
    const r = detectIntentFast('сколько на продукты');
    expect(r.intent).toBe('show_category_spend');
    expect(r.params.category).toBe('продукты');
  });

  it('detects create_transaction from "500 на кофе"', () => {
    const r = detectIntentFast('500 на кофе');
    expect(r.intent).toBe('create_transaction');
    expect(r.params.amount).toBe(500);
    expect(r.params.description).toBe('кофе');
  });

  it('detects advice from "дай совет"', () => {
    expect(detectIntentFast('дай совет').intent).toBe('advice');
  });

  it('detects advice from "как сэкономить"', () => {
    expect(detectIntentFast('как сэкономить').intent).toBe('advice');
  });

  it('detects advice from "помоги с финансами"', () => {
    expect(detectIntentFast('помоги с финансами').intent).toBe('advice');
  });

  it('returns unknown for gibberish', () => {
    const r = detectIntentFast('привет как дела');
    expect(r.intent).toBe('unknown');
    expect(r.confidence).toBe(0);
  });

  it('returns unknown for ambiguous text', () => {
    expect(detectIntentFast('хорошая погода').intent).toBe('unknown');
  });

  it('preserves rawText', () => {
    const text = 'Покажи БАЛАНС';
    expect(detectIntentFast(text).rawText).toBe(text);
  });
});

import type { ParsedIntent } from './intents';

export function detectIntentFast(text: string): ParsedIntent {
  const lower = text.toLowerCase().trim();

  // show_balance
  if (/балан[сc]/.test(lower) || /сколько\s+(на\s+счет|денег|осталось)/.test(lower)) {
    return { intent: 'show_balance', confidence: 0.9, params: {}, rawText: text };
  }

  // show_last
  if (/послед|крайн|недавн/.test(lower)) {
    return { intent: 'show_last', confidence: 0.85, params: {}, rawText: text };
  }

  // show_goals
  if (/цел[иьяей]/.test(lower) && !/категори/.test(lower)) {
    return { intent: 'show_goals', confidence: 0.85, params: {}, rawText: text };
  }

  // show_budgets
  if (/бюджет[ыаов]?(?:\s|$)/.test(lower) && !/создай|установи|поставь|добавь/.test(lower)) {
    return { intent: 'show_budgets', confidence: 0.8, params: {}, rawText: text };
  }

  // create_budget (with amount)
  const budgetMatch = lower.match(/(?:создай|установи|поставь|добавь)\s+бюджет.*?(\d[\d\s]*)\s*(?:руб|₽|р\b)?/);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1].replace(/\s/g, ''), 10);
    const catMatch = lower.match(/(?:на|для|по)\s+(?:категори[юи]\s+)?([а-яё]+)/);
    return {
      intent: 'create_budget',
      confidence: 0.8,
      params: { amount, category: catMatch?.[1] },
      rawText: text,
    };
  }

  // show_expenses with period
  const expenseMatch = lower.match(/(?:потратил|расход|трат).*?(?:за\s+)?(недел[юиь]|месяц|сегодн|вчера|год)/);
  if (expenseMatch) {
    return {
      intent: 'show_expenses',
      confidence: 0.85,
      params: { period: expenseMatch[1] },
      rawText: text,
    };
  }

  // show_category_spend
  const catSpendMatch = lower.match(/сколько.*(?:на|в|за)\s+([а-яё]+(?:\s+[а-яё]+)?)/);
  if (catSpendMatch && !/счет|денег|осталось|балан/.test(lower)) {
    return {
      intent: 'show_category_spend',
      confidence: 0.75,
      params: { category: catSpendMatch[1] },
      rawText: text,
    };
  }

  // create_transaction
  const txMatch = lower.match(/(\d[\d\s]*)[\s]*(?:руб|₽|р\b)?\s+(?:на|за)\s+(.+)/);
  if (txMatch) {
    const amount = parseInt(txMatch[1].replace(/\s/g, ''), 10);
    return {
      intent: 'create_transaction',
      confidence: 0.7,
      params: { amount, description: txMatch[2].trim(), type: 'EXPENSE' },
      rawText: text,
    };
  }

  // advice
  if (/совет|экономи[тья]|помог[иа]|подскаж|рекоменд|как\s+(сэконом|накоп|сбереч)/.test(lower)) {
    return { intent: 'advice', confidence: 0.8, params: {}, rawText: text };
  }

  return { intent: 'unknown', confidence: 0, params: {}, rawText: text };
}

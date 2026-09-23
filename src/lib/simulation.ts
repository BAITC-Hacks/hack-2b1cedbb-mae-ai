export const INITIAL_BUDGET = 100;
export const METRICS = [
  { key: "mobility", label: "Мобильность" },
  { key: "ecology", label: "Экология" },
  { key: "social", label: "Социальная сфера" },
  { key: "safety", label: "Безопасность" },
  { key: "services", label: "Городские сервисы" },
] as const;
export type MetricKey = (typeof METRICS)[number]["key"];
export type CityMetrics = Record<MetricKey, number>;
export type Decision = { id: string; name: string; cost: number; effects: CityMetrics };
export type Round = { id: string; title: string; description: string; decisions: readonly Decision[] };
export type SimulationState = {
  status: "START" | "SIMULATION" | "RESULT";
  budget: number;
  metrics: CityMetrics;
  choices: readonly Decision[];
};
export type SimulationAction = { type: "START" } | { type: "CHOOSE"; decisionId: string };

export const ROUNDS: readonly Round[] = [
  {
    id: "transport", title: "Транспорт", description: "Задайте новый ритм города. Как будет двигаться Астана?",
    decisions: [
      { id: "traffic-signals", name: "Adaptive Traffic Signals", cost: 14, effects: { mobility: 8, ecology: 1, social: 0, safety: 2, services: 4 } },
      { id: "bus-priority", name: "Bus Priority Corridors", cost: 21, effects: { mobility: 12, ecology: 5, social: 4, safety: 2, services: 1 } },
      { id: "road-capacity", name: "Road Capacity Program", cost: 26, effects: { mobility: 15, ecology: -5, social: -3, safety: 2, services: 0 } },
    ],
  },
  {
    id: "greenery", title: "Озеленение", description: "Дайте городу больше воздуха. Выберите подход к озеленению.",
    decisions: [
      { id: "irrigation", name: "Smart Irrigation", cost: 12, effects: { mobility: 0, ecology: 8, social: 1, safety: 0, services: 3 } },
      { id: "pocket-parks", name: "Pocket Parks", cost: 18, effects: { mobility: 0, ecology: 9, social: 7, safety: 2, services: 0 } },
      { id: "green-corridors", name: "Green Corridors", cost: 24, effects: { mobility: 2, ecology: 14, social: 5, safety: 1, services: 0 } },
    ],
  },
  {
    id: "social", title: "Социальная сфера", description: "Город для людей. Во что вложить ресурсы сегодня?",
    decisions: [
      { id: "public-spaces", name: "Inclusive Public Spaces", cost: 14, effects: { mobility: 0, ecology: 2, social: 8, safety: 2, services: 0 } },
      { id: "youth-centers", name: "Youth & Skills Centers", cost: 20, effects: { mobility: 0, ecology: 0, social: 11, safety: 3, services: 4 } },
      { id: "school-clinic", name: "School & Clinic Access", cost: 28, effects: { mobility: 4, ecology: 0, social: 15, safety: 3, services: 2 } },
    ],
  },
  {
    id: "safety", title: "Безопасность", description: "Спокойствие начинается с продуманных решений. Определите приоритет.",
    decisions: [
      { id: "street-lighting", name: "Smart Street Lighting", cost: 13, effects: { mobility: 0, ecology: -1, social: 0, safety: 8, services: 2 } },
      { id: "safe-routes", name: "Safe Routes", cost: 19, effects: { mobility: 4, ecology: 0, social: 5, safety: 10, services: 0 } },
      { id: "emergency", name: "Emergency Coordination", cost: 25, effects: { mobility: 0, ecology: 0, social: 2, safety: 14, services: 6 } },
    ],
  },
  {
    id: "services", title: "Городские сервисы", description: "Последний шаг. Сделайте взаимодействие с городом удобнее.",
    decisions: [
      { id: "open-data", name: "Open Data & City Feedback", cost: 11, effects: { mobility: 0, ecology: 0, social: 4, safety: 0, services: 7 } },
      { id: "city-app", name: "Unified City App", cost: 17, effects: { mobility: 1, ecology: 0, social: 4, safety: 0, services: 11 } },
      { id: "predictive", name: "Predictive City Operations", cost: 23, effects: { mobility: 3, ecology: 2, social: 0, safety: 4, services: 14 } },
    ],
  },
];

export function createSimulation(): SimulationState {
  return { status: "START", budget: INITIAL_BUDGET, metrics: { mobility: 50, ecology: 50, social: 50, safety: 50, services: 50 }, choices: [] };
}
export function calculateImbalancePenalty(metrics: CityMetrics): number {
  const values = METRICS.map(({ key }) => metrics[key]);
  const range = Math.max(...values) - Math.min(...values);
  return Math.min(8, Math.max(0, range - 15) * 0.25);
}

export function calculateQoL(metrics: CityMetrics): number {
  const average = METRICS.reduce((sum, { key }) => sum + metrics[key], 0) / METRICS.length;
  return Math.min(100, Math.max(0, average - calculateImbalancePenalty(metrics)));
}

// Preserve the existing public function for callers using its original name.
export function getQualityOfLife(metrics: CityMetrics): number {
  return calculateQoL(metrics);
}

// The current round is zero-based; only subsequent rounds need a reserve.
export function calculateMinimumFutureCost(currentRoundIndex: number): number {
  return ROUNDS.slice(currentRoundIndex + 1).reduce(
    (sum, round) => sum + Math.min(...round.decisions.map((item) => item.cost)),
    0,
  );
}

export function getDecisionAvailability(state: SimulationState, decisionId: string): { allowed: boolean; reason?: string } {
  const decision = ROUNDS[state.choices.length]?.decisions.find((item) => item.id === decisionId);
  if (state.status !== "SIMULATION" || !decision) return { allowed: false, reason: "Решение недоступно в этом раунде." };
  const remainingBudget = state.budget - decision.cost;
  if (remainingBudget < 0 || remainingBudget < calculateMinimumFutureCost(state.choices.length)) {
    return { allowed: false, reason: "После этого решения бюджета не хватит завершить программу" };
  }
  return { allowed: true };
}

export function canSelectDecision(state: SimulationState, decisionId: string): boolean {
  return getDecisionAvailability(state, decisionId).allowed;
}

export function applyDecision(state: SimulationState, decisionId: string): SimulationState {
  if (!canSelectDecision(state, decisionId)) return state;
  const decision = ROUNDS[state.choices.length].decisions.find((item) => item.id === decisionId)!;
  const metrics = { ...state.metrics };
  for (const { key } of METRICS) metrics[key] += decision.effects[key];
  const choices = [...state.choices, decision];
  return { status: choices.length === ROUNDS.length ? "RESULT" : "SIMULATION", budget: state.budget - decision.cost, metrics, choices };
}

export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  if (action.type === "START") return state.status === "START" ? { ...state, status: "SIMULATION" } : state;
  return applyDecision(state, action.decisionId);
}

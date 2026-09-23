import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDecision, calculateImbalancePenalty, calculateMinimumFutureCost, calculateQoL, canSelectDecision, createSimulation, getDecisionAvailability, getQualityOfLife, METRICS, ROUNDS, simulationReducer } from "../src/lib/simulation.ts";

const start = () => simulationReducer(createSimulation(), { type: "START" });
const choose = (state, decisionId) => simulationReducer(state, { type: "CHOOSE", decisionId });

test("starts with budget 100 and five indicators at 50", () => {
  const state = createSimulation();
  assert.equal(state.status, "START");
  assert.equal(state.budget, 100);
  assert.deepEqual(Object.values(state.metrics), [50, 50, 50, 50, 50]);
  assert.equal(getQualityOfLife(state.metrics), 50);
  assert.equal(choose(state, "traffic-signals"), state);
  assert.equal(start().status, "SIMULATION");
});

test("all 15 costs and effect vectors match the specification", () => {
  const expected = [
    [14, 8, 1, 0, 2, 4], [21, 12, 5, 4, 2, 1], [26, 15, -5, -3, 2, 0],
    [12, 0, 8, 1, 0, 3], [18, 0, 9, 7, 2, 0], [24, 2, 14, 5, 1, 0],
    [14, 0, 2, 8, 2, 0], [20, 0, 0, 11, 3, 4], [28, 4, 0, 15, 3, 2],
    [13, 0, -1, 0, 8, 2], [19, 4, 0, 5, 10, 0], [25, 0, 0, 2, 14, 6],
    [11, 0, 0, 4, 0, 7], [17, 1, 0, 4, 0, 11], [23, 3, 2, 0, 4, 14],
  ];
  assert.equal(ROUNDS.length, 5);
  ROUNDS.forEach((round) => assert.equal(round.decisions.length, 3));
  assert.deepEqual(ROUNDS.flatMap((round) => round.decisions.map((d) => [d.cost, ...METRICS.map(({ key }) => d.effects[key])])), expected);
});

test("five cheapest decisions produce the expected totals and result state", () => {
  let state = start();
  const qualityByRound = [53, 55.4, 57.8, 59.6, 61.8];
  const budgetByRound = [86, 74, 60, 47, 36];
  for (let index = 0; index < 5; index++) {
    state = choose(state, ROUNDS[index].decisions[0].id);
    assert.equal(state.budget, budgetByRound[index]);
    assert.equal(getQualityOfLife(state.metrics), qualityByRound[index]);
    assert.equal(state.choices.length, index + 1);
    assert.equal(state.status, index === 4 ? "RESULT" : "SIMULATION");
  }
  assert.deepEqual(state.metrics, { mobility: 58, ecology: 60, social: 63, safety: 62, services: 66 });
  assert.equal(choose(state, "open-data"), state);
});

test("negative effects apply, stale clicks and out-of-round choices are ignored", () => {
  const initial = start();
  assert.equal(choose(initial, "city-app"), initial);
  assert.equal(choose(initial, "unknown"), initial);
  const state = choose(initial, "road-capacity");
  assert.deepEqual(state.metrics, { mobility: 65, ecology: 45, social: 47, safety: 52, services: 50 });
  assert.equal(calculateImbalancePenalty(state.metrics), 1.25);
  assert.equal(getQualityOfLife(state.metrics), 50.55);
  assert.equal(choose(state, "road-capacity"), state);
  assert.equal(simulationReducer(state, { type: "START" }), state);
  assert.equal(initial.budget, 100);
  assert.equal(initial.metrics.ecology, 50);
});

test("reserves enough for later rounds and rejects unaffordable decisions", () => {
  let state = choose(choose(start(), "road-capacity"), "green-corridors");
  assert.equal(state.budget, 50);
  assert.equal(calculateMinimumFutureCost(2), 24);
  assert.equal(canSelectDecision(state, "school-clinic"), false);
  assert.equal(canSelectDecision(state, "youth-centers"), true);
  assert.equal(getDecisionAvailability(state, "school-clinic").allowed, false);
  assert.equal(getDecisionAvailability(state, "school-clinic").reason, "После этого решения бюджета не хватит завершить программу");
  assert.equal(choose(state, "school-clinic"), state);
  assert.equal(applyDecision(state, "school-clinic"), state);
  state = choose(choose(state, "youth-centers"), "safe-routes");
  assert.equal(state.budget, 11);
  assert.equal(choose(state, "city-app"), state);
  assert.equal(choose(state, "predictive"), state);
  state = choose(state, "open-data");
  assert.equal(state.budget, 0);
  assert.equal(state.status, "RESULT");
  assert.deepEqual(state.metrics, { mobility: 71, ecology: 59, social: 72, safety: 66, services: 61 });
  assert.equal(calculateQoL(state.metrics), 65.8);
  assert.equal(state.choices.length, 5);
});

test("imbalance threshold, quarter-point penalty, cap and QoL bounds", () => {
  const metrics = { mobility: 50, ecology: 50, social: 50, safety: 50, services: 50 };
  assert.equal(calculateImbalancePenalty(metrics), 0);
  assert.equal(calculateImbalancePenalty({ ...metrics, mobility: 65 }), 0);
  assert.equal(calculateQoL({ ...metrics, mobility: 65 }), 53);
  assert.equal(calculateImbalancePenalty({ ...metrics, mobility: 66 }), 0.25);
  assert.equal(calculateQoL({ ...metrics, mobility: 66 }), 52.95);
  assert.equal(calculateImbalancePenalty({ ...metrics, mobility: 97 }), 8);
  assert.equal(calculateImbalancePenalty({ ...metrics, mobility: 100, ecology: 0 }), 8);
  assert.equal(calculateQoL({ ...metrics, mobility: 100, ecology: 0 }), 42);
  assert.equal(calculateQoL({ mobility: 0, ecology: 0, social: 0, safety: 0, services: 20 }), 2.75);
  assert.equal(calculateQoL({ mobility: 0, ecology: 0, social: 0, safety: 0, services: -100 }), 0);
  assert.equal(calculateQoL({ mobility: 120, ecology: 120, social: 120, safety: 120, services: 120 }), 100);
});

test("minimum future cost excludes the current round and is zero in the last round", () => {
  assert.deepEqual(ROUNDS.map((_, index) => calculateMinimumFutureCost(index)), [50, 38, 24, 11, 0]);
});

test("final score includes imbalance penalty after five decisions", () => {
  let state = start();
  for (const id of ["traffic-signals", "pocket-parks", "school-clinic", "safe-routes", "city-app"]) {
    state = applyDecision(state, id);
  }
  assert.equal(state.status, "RESULT");
  assert.equal(state.budget, 4);
  assert.deepEqual(state.metrics, { mobility: 67, ecology: 60, social: 81, safety: 67, services: 67 });
  assert.equal(calculateImbalancePenalty(state.metrics), 1.5);
  assert.equal(calculateQoL(state.metrics), 66.9);
  assert.equal(getQualityOfLife(state.metrics), 66.9);
});

test("every affordable five-round combination completes with correct totals; no reachable dead ends", () => {
  let completed = 0;
  let affordableCombinations = 0;
  function countCombinations(index, cost) {
    if (index === 5) { if (cost <= 100) affordableCombinations++; return; }
    for (const decision of ROUNDS[index].decisions) countCombinations(index + 1, cost + decision.cost);
  }
  function walk(state) {
    assert.ok(state.budget >= 0);
    if (state.status === "RESULT") {
      completed++;
      assert.equal(state.choices.length, 5);
      assert.equal(state.budget, 100 - state.choices.reduce((sum, d) => sum + d.cost, 0));
      const expected = Object.fromEntries(METRICS.map(({ key }) => [key, 50 + state.choices.reduce((sum, d) => sum + d.effects[key], 0)]));
      assert.deepEqual(state.metrics, expected);
      const values = Object.values(expected);
      const range = Math.max(...values) - Math.min(...values);
      const penalty = range <= 15 ? 0 : range >= 47 ? 8 : (range - 15) / 4;
      const expectedQoL = Math.max(0, Math.min(100, values.reduce((a, b) => a + b) / 5 - penalty));
      assert.equal(calculateQoL(state.metrics), expectedQoL);
      assert.ok(calculateQoL(state.metrics) >= 0 && calculateQoL(state.metrics) <= 100);
      return;
    }
    const available = ROUNDS[state.choices.length].decisions.filter((d) => getDecisionAvailability(state, d.id).allowed);
    assert.ok(available.length > 0, "A reachable round must have at least one choice");
    for (const decision of available) walk(choose(state, decision.id));
  }
  countCombinations(0, 0);
  walk(start());
  assert.equal(completed, affordableCombinations);
  assert.ok(completed > 100);
  console.log(`Verified ${completed} complete five-round paths (out of 243 total combinations).`);
});

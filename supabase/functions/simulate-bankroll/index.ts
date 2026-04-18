// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SimRequest {
  initialBankroll: number;
  numBets: number;
  expectedRoi: number;
  avgOdd: number;
  stakeMode: "fixed" | "percent" | "kelly";
  stakeValue: number;
  numSimulations?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as SimRequest;
    const { initialBankroll, numBets, expectedRoi, avgOdd, stakeMode, stakeValue, numSimulations = 1000 } = body;

    if (!initialBankroll || !numBets || !avgOdd || avgOdd <= 1) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Implied prob from EV: ev = p*odd - 1 → p = (1 + ev) / odd
    const trueProb = Math.min(0.99, Math.max(0.01, (1 + expectedRoi) / avgOdd));

    // Sample STEP every Math.max(1, floor(numBets/100)) bets to keep payload small
    const stepEvery = Math.max(1, Math.floor(numBets / 100));
    const numSteps = Math.floor(numBets / stepEvery) + 1;

    // simulations[step][sim] = bankroll value
    const trajectories: number[][] = Array.from({ length: numSteps }, () => new Array(numSimulations).fill(0));

    let ruined = 0;
    let positives = 0;
    const finals: number[] = [];

    for (let s = 0; s < numSimulations; s++) {
      let bk = initialBankroll;
      let stepIdx = 0;
      trajectories[0][s] = bk;
      let didRuin = false;
      for (let i = 1; i <= numBets; i++) {
        let stake = 0;
        if (stakeMode === "fixed") stake = stakeValue;
        else if (stakeMode === "percent") stake = bk * (stakeValue / 100);
        else if (stakeMode === "kelly") {
          const b = avgOdd - 1;
          const f = Math.max(0, ((trueProb * (b + 1) - 1) / b) * 0.25);
          stake = bk * f;
        }
        stake = Math.min(stake, bk);
        if (stake <= 0) { didRuin = true; }
        const win = Math.random() < trueProb;
        bk += win ? stake * (avgOdd - 1) : -stake;
        if (bk <= 0) { bk = 0; didRuin = true; }
        if (i % stepEvery === 0 && stepIdx + 1 < numSteps) {
          stepIdx++;
          trajectories[stepIdx][s] = bk;
        }
        if (didRuin) {
          for (let k = stepIdx; k < numSteps; k++) trajectories[k][s] = 0;
          break;
        }
      }
      finals.push(bk);
      if (didRuin) ruined++;
      if (bk > initialBankroll) positives++;
    }

    const percentile = (arr: number[], p: number) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.floor((sorted.length - 1) * p);
      return sorted[idx];
    };

    const bands = trajectories.map((vals, i) => ({
      step: i * stepEvery,
      p10: Math.round(percentile(vals, 0.1) * 100) / 100,
      p50: Math.round(percentile(vals, 0.5) * 100) / 100,
      p90: Math.round(percentile(vals, 0.9) * 100) / 100,
    }));

    const finalMean = finals.reduce((a, b) => a + b, 0) / finals.length;
    const finalMedian = percentile(finals, 0.5);

    return new Response(JSON.stringify({
      bands,
      finalMean: Math.round(finalMean * 100) / 100,
      finalMedian: Math.round(finalMedian * 100) / 100,
      ruinProb: ruined / numSimulations,
      positiveProb: positives / numSimulations,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

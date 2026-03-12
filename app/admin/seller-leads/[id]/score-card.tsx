"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LatestScore = {
  createdAt: string;
  score: number;
  segment: string;
  nextBestAction: string;
  breakdown: {
    intent: number;
    asset: number;
    readiness: number;
    objectionDetected?: boolean;
    competitorRiskDetected?: boolean;
    topFloorBonus?: number;
    seaViewBonus?: number;
  } | null;
};

type AiInsight = {
  summary: string;
  competitorRiskLevel: "low" | "medium" | "high";
  recommendedPitch: string;
  nextAction: string;
  generatedAt: string;
  model: string;
};

type ScoreCardProps = {
  sellerLeadId: string;
  latestScore: LatestScore | null;
  aiInsight: AiInsight | null;
};

const formatSegment = (segment: string) => {
  switch (segment) {
    case "priority_a":
      return "Priorite A";
    case "priority_b":
      return "Priorite B";
    case "priority_c":
      return "Priorite C";
    default:
      return segment;
  }
};

const formatAction = (action: string) => {
  switch (action) {
    case "book_listing_appointment":
      return "Prendre un rendez-vous mandat";
    case "objection_handling_call":
      return "Appel de traitement des objections vendeur";
    case "differentiation_call_2h":
      return "Appel de differenciation boutique locale sous 2h";
    case "callback_with_admin_support":
      return "Rappel avec accompagnement administratif";
    case "qualify_call_24h":
      return "Appel de qualification sous 24h";
    case "nurture_sequence":
      return "Nurturing vendeur";
    default:
      return action;
  }
};

const formatRisk = (risk: AiInsight["competitorRiskLevel"]) => {
  if (risk === "high") return "Eleve";
  if (risk === "low") return "Faible";
  return "Moyen";
};

export function SellerLeadScoreCard({ sellerLeadId, latestScore, aiInsight }: ScoreCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAiPending, startAiTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const recalculate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/seller-leads/${sellerLeadId}/score`, {
          method: "POST",
        });
        const data = (await response.json()) as { ok?: boolean; message?: string };
        if (!response.ok || !data.ok) {
          setError(data.message ?? "Impossible de recalculer le scoring.");
          return;
        }
        router.refresh();
      } catch {
        setError("Erreur reseau pendant le recalcul du score.");
      }
    });
  };

  const runAiAnalysis = () => {
    setError(null);
    startAiTransition(async () => {
      try {
        const response = await fetch(`/api/admin/seller-leads/${sellerLeadId}/ai-insight`, {
          method: "POST",
        });
        const data = (await response.json()) as { ok?: boolean; message?: string };
        if (!response.ok || !data.ok) {
          setError(data.message ?? "Impossible de lancer l'analyse IA.");
          return;
        }
        router.refresh();
      } catch {
        setError("Erreur reseau pendant l'analyse IA.");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-[rgba(20,20,70,0.22)] p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="sillage-section-title">Scoring vendeur</h2>
        <div className="flex items-center gap-2">
          <button
            className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
            onClick={recalculate}
            disabled={isPending || isAiPending}
            type="button"
          >
            {isPending ? "Recalcul..." : "Recalculer le score"}
          </button>
          <button
            className="rounded border px-4 py-2 text-sm disabled:opacity-60"
            onClick={runAiAnalysis}
            disabled={isPending || isAiPending}
            type="button"
          >
            {isAiPending ? "Analyse IA..." : "Analyser avec IA"}
          </button>
        </div>
      </div>

      {!latestScore ? (
        <p className="text-sm opacity-70">
          Aucun scoring encore calcule sur ce lead vendeur.
        </p>
      ) : (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="opacity-70">Score:</span> {latestScore.score}/100
          </p>
          <p>
            <span className="opacity-70">Segment:</span> {formatSegment(latestScore.segment)}
          </p>
          <p className="sm:col-span-2">
            <span className="opacity-70">Action recommandee:</span>{" "}
            {formatAction(latestScore.nextBestAction)}
          </p>
          {latestScore.breakdown ? (
            <>
              <p className="sm:col-span-2 opacity-80">
                Ventilation - Intention: {latestScore.breakdown.intent}, Actif:{" "}
                {latestScore.breakdown.asset}, Preparation: {latestScore.breakdown.readiness}
              </p>
              <p className="sm:col-span-2 opacity-80">
                Bonus actifs - Dernier etage: +{latestScore.breakdown.topFloorBonus ?? 0},
                Vue mer: +{latestScore.breakdown.seaViewBonus ?? 0}
              </p>
            </>
          ) : null}
          {latestScore.breakdown?.objectionDetected ? (
            <p className="sm:col-span-2 rounded border border-amber-300 bg-amber-50 p-2 text-amber-800">
              Alerte commerciale: objection detectee sur le passage par agence.
              Prevoir un script de traitement des objections.
            </p>
          ) : null}
          {latestScore.breakdown?.competitorRiskDetected ? (
            <p className="sm:col-span-2 rounded border border-red-300 bg-red-50 p-2 text-red-800">
              Alerte concurrence: le vendeur evoque un reseau national.
              Prevoir un argumentaire de differenciation locale (expertise micro-marche, accompagnement
              premium, disponibilite).
            </p>
          ) : null}
          <p className="sm:col-span-2 text-xs opacity-60">
            Dernier calcul: {new Date(latestScore.createdAt).toLocaleString("fr-FR")}
          </p>
        </div>
      )}

      {aiInsight ? (
        <div className="rounded border border-[rgba(20,20,70,0.2)] bg-[rgba(244,236,228,0.9)] p-3 text-sm space-y-2">
          <p>
            <span className="opacity-70">Synthese IA:</span> {aiInsight.summary}
          </p>
          <p>
            <span className="opacity-70">Risque concurrent:</span>{" "}
            {formatRisk(aiInsight.competitorRiskLevel)}
          </p>
          <p>
            <span className="opacity-70">Argumentaire recommande:</span>{" "}
            {aiInsight.recommendedPitch}
          </p>
          <p>
            <span className="opacity-70">Prochaine action IA:</span> {aiInsight.nextAction}
          </p>
          <p className="text-xs opacity-60">
            Analyse du {new Date(aiInsight.generatedAt).toLocaleString("fr-FR")} - modele{" "}
            {aiInsight.model}
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}

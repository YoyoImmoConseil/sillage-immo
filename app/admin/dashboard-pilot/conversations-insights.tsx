"use client";

import { Card, Title, BarList, Metric, Text, Flex } from "@tremor/react";
import type { ConversationsSnapshot } from "@/services/admin/dashboard-aggregator.service";

export function ConversationsInsights({
  snapshot,
}: {
  snapshot: ConversationsSnapshot;
}) {
  const topicData = snapshot.topTopics.map((topic) => ({
    name: topic.key,
    value: topic.count,
  }));

  return (
    <Card className="bg-white/80">
      <Title className="text-[#141446]">
        Voix du marché — conversations IA (30 j)
      </Title>
      <Flex className="mt-4" justifyContent="start">
        <div className="flex flex-wrap gap-6">
          <div>
            <Text className="text-[#141446]/60">Total</Text>
            <Metric className="text-[#141446]">{snapshot.totalLast30d}</Metric>
          </div>
          <div>
            <Text className="text-[#141446]/60">Anonymes (homepage)</Text>
            <Metric className="text-[#141446]">
              {snapshot.anonymousLast30d}
            </Metric>
          </div>
          <div>
            <Text className="text-[#141446]/60">Vendeurs</Text>
            <Metric className="text-[#141446]">{snapshot.sellerLast30d}</Metric>
          </div>
          <div>
            <Text className="text-[#141446]/60">Acquéreurs</Text>
            <Metric className="text-[#141446]">{snapshot.buyerLast30d}</Metric>
          </div>
        </div>
      </Flex>

      <Title className="mt-6 text-base text-[#141446]/80">
        Mots-clés émergents
      </Title>
      {topicData.length === 0 ? (
        <p className="mt-3 text-sm text-[#141446]/60">
          Aucun mot-clé significatif sur la période. Le masquage PII supprime
          les emails/téléphones avant analyse.
        </p>
      ) : (
        <BarList
          data={topicData}
          className="mt-3"
          valueFormatter={(value: number) => value.toLocaleString("fr-FR")}
        />
      )}
      <p className="mt-3 text-xs text-[#141446]/60">
        Source : ai_conversations + ai_messages (PII masquée, conservation 90 j).
      </p>
    </Card>
  );
}

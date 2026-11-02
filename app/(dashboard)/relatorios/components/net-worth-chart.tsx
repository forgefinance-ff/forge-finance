"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  chartAxisStroke,
  chartAxisTick,
  chartGridStroke,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
} from "@/lib/chart-theme";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NetWorthItem } from "../data/net-worth";

type Props = {
  data: NetWorthItem[];
};

export function NetWorthChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Patrimonial</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="month"
                stroke={chartAxisStroke}
                tick={chartAxisTick}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke={chartAxisStroke}
                tick={chartAxisTick}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip
                contentStyle={chartTooltipStyle}
                labelStyle={chartTooltipLabelStyle}
                itemStyle={chartTooltipItemStyle}
              />

              <Area
                type="monotone"
                dataKey="patrimonio"
                stroke="#a855f7"
                fill="#a855f7"
                fillOpacity={0.2}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
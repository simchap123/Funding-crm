import { Users, UserPlus, TrendingUp, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  totalContacts: number;
  newThisWeek: number;
  conversionRate: number;
  wonDeals: number;
}

export function StatsCards({
  totalContacts,
  newThisWeek,
  conversionRate,
  wonDeals,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Contacts",
      value: totalContacts,
      icon: Users,
      description: "All contacts in your CRM",
    },
    {
      title: "New This Week",
      value: newThisWeek,
      icon: UserPlus,
      description: "Contacts added this week",
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      description: "Won / (Won + Lost)",
    },
    {
      title: "Won Deals",
      value: wonDeals,
      icon: Trophy,
      description: "Successfully closed deals",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

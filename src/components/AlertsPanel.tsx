import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileWarning, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: 'missing_report' | 'incomplete_data' | 'absent_students';
  title: string;
  description: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'missing_report':
        return <FileWarning className="h-5 w-5" />;
      case 'incomplete_data':
        return <AlertCircle className="h-5 w-5" />;
      case 'absent_students':
        return <Users className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Alerts</CardTitle>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {alerts.reduce((sum, alert) => sum + alert.count, 0)}
            </Badge>
          )}
        </div>
        <CardDescription>
          Important notifications and missing reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No alerts at this time</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                alert.severity === 'high' && "border-red-500/50 bg-red-500/5",
                alert.severity === 'medium' && "border-yellow-500/50 bg-yellow-500/5",
                alert.severity === 'low' && "border-blue-500/50 bg-blue-500/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  alert.severity === 'high' && "bg-red-500/10 text-red-500",
                  alert.severity === 'medium' && "bg-yellow-500/10 text-yellow-500",
                  alert.severity === 'low' && "bg-blue-500/10 text-blue-500"
                )}>
                  {getIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <Badge
                      className={cn(
                        "animate-bounce",
                        getSeverityColor(alert.severity)
                      )}
                    >
                      {alert.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alert.description}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type KpiCardProps = {
  title: string
  value: string | number
  sublabel?: string
}

export function KpiCard({ title, value, sublabel }: KpiCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {sublabel ? <p className="text-sm text-muted-foreground">{sublabel}</p> : null}
      </CardContent>
    </Card>
  )
}

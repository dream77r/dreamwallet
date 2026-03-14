'use client'

import { ResponsiveSankey } from '@nivo/sankey'
import { Card, CardContent } from '@/components/ui/card'

interface SankeyNode {
  id: string
  label?: string
  color?: string
}

interface SankeyLink {
  source: string
  target: string
  value: number
}

interface SankeyDiagramProps {
  nodes: SankeyNode[]
  links: SankeyLink[]
  title?: string
}

export function SankeyDiagram({
  nodes,
  links,
  title = 'Потоки денег',
}: SankeyDiagramProps) {
  if (!nodes.length || !links.length) {
    return (
      <Card className="rounded-3xl">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Нет данных для диаграммы</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl">
      <CardContent className="p-5">
        <h3 className="font-semibold text-sm mb-4">{title}</h3>
        <div className="h-[400px]">
          <ResponsiveSankey
            data={{ nodes, links }}
            margin={{ top: 20, right: 160, bottom: 20, left: 20 }}
            align="justify"
            colors={{ scheme: 'category10' }}
            nodeOpacity={1}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={16}
            nodeSpacing={20}
            nodeBorderWidth={0}
            nodeBorderRadius={3}
            linkOpacity={0.4}
            linkHoverOthersOpacity={0.1}
            linkContract={3}
            enableLinkGradient
            labelPosition="outside"
            labelOrientation="horizontal"
            labelPadding={12}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
            nodeTooltip={({ node }) => (
              <div className="bg-popover text-popover-foreground rounded-xl px-3 py-2 shadow-lg border text-sm">
                <strong>{node.label}</strong>
                <br />
                {node.value.toLocaleString('ru-RU')} ₽
              </div>
            )}
            linkTooltip={({ link }) => (
              <div className="bg-popover text-popover-foreground rounded-xl px-3 py-2 shadow-lg border text-sm">
                <span>{link.source.label}</span>
                <span className="mx-1 text-muted-foreground">→</span>
                <span>{link.target.label}</span>
                <br />
                <strong>{link.value.toLocaleString('ru-RU')} ₽</strong>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

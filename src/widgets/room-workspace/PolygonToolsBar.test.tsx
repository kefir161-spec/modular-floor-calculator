import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PolygonToolsBar } from '@/widgets/room-workspace/PolygonToolsBar'

describe('PolygonToolsBar', () => {
  it('скрывает кисть, если в серии один цвет', () => {
    render(
      <PolygonToolsBar
        tool="select"
        onToolChange={() => {}}
        snapOrtho
        onSnapOrthoChange={() => {}}
        snapGridMm={50}
        onSnapGridChange={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Кисть' })).not.toBeInTheDocument()
  })

  it('показывает кисть, когда цветов несколько', () => {
    render(
      <PolygonToolsBar
        tool="select"
        onToolChange={() => {}}
        snapOrtho
        onSnapOrthoChange={() => {}}
        snapGridMm={50}
        onSnapGridChange={() => {}}
        showBrush
      />,
    )
    expect(screen.getByRole('button', { name: 'Кисть' })).toBeInTheDocument()
  })
})

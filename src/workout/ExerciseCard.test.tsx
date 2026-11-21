import { render, screen } from '@testing-library/react'
import { pe } from '../../test/helpers'
import { ExerciseCard } from './ExerciseCard'

test('série pulada sai do total do contador, como no sessionStats', () => {
  const ex = { ...pe({ name: 'Supino' }), sets: [{ reps: '10', weightKg: 40 }, { reps: '10', weightKg: 40 }, null], skipped: [2] }
  render(<ExerciseCard ex={ex} prev={[]} open={false} onToggle={() => {}} onPreview={() => {}} />)
  expect(screen.getByText('2/2')).toBeInTheDocument()
})

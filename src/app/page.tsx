import { redirect } from 'next/navigation'

// Flow A: My Tasks is the daily landing page.
export default function Home() {
  redirect('/tasks')
}

import { useContext } from 'react'
import { DemoContext } from './DemoContext'

export function useDemoMode() {
  return useContext(DemoContext)
}

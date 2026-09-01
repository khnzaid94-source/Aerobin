import { createContext } from 'react'

export const DemoContext = createContext({ demoMode: false, setDemoMode: () => {} })

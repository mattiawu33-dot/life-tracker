import '@fontsource-variable/inter'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { HabitsProvider } from './features/habits/HabitsProvider.tsx'
import { TasksProvider } from './features/tasks/TasksProvider.tsx'
import './index.css'
import { ThemeProvider } from './theme/ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TasksProvider>
        <HabitsProvider>
          <App />
        </HabitsProvider>
      </TasksProvider>
    </ThemeProvider>
  </StrictMode>,
)

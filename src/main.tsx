import '@fontsource-variable/inter'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { HabitsProvider } from './features/habits/HabitsProvider.tsx'
import { TasksProvider } from './features/tasks/TasksProvider.tsx'
import { TrainerProvider } from './features/trainer/TrainerProvider.tsx'
import './index.css'
import { ThemeProvider } from './theme/ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TasksProvider>
        <HabitsProvider>
          <TrainerProvider>
            <App />
          </TrainerProvider>
        </HabitsProvider>
      </TasksProvider>
    </ThemeProvider>
  </StrictMode>,
)

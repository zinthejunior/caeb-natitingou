// Point d'entrée de l'application React
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './lib/adaptiveFg' // Charge le système de couleur adaptatif

// Initialise l'application React en mode strict pour détecter les problèmes potentiels
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

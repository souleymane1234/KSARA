import { useEffect } from 'react';
import { startEngine } from './legacy/engine.js';
import MountPoints from './components/MountPoints.jsx';

/**
 * Composant racine.
 * - MountPoints rend les conteneurs (#root, #modal-root, #drawer-root, #tour-root, #toast-root).
 * - startEngine() branche le moteur de la plateforme (rendu des vues, modules, actions)
 *   une fois les conteneurs montés, et renvoie une fonction de nettoyage.
 */
export default function App() {
  useEffect(() => startEngine(), []);
  return <MountPoints />;
}

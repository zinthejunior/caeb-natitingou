/**
 * ErrorBoundary.tsx
 *
 * Composant de niveau supérieur pour capturer les erreurs JavaScript
 * dans l'arborescence React et afficher un message utilisateur
 * plutôt qu'un écran blanc.
 */
import React from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  } 

  componentDidCatch(_error: Error, _info: any) {
    // À implémenter : envoyer l'erreur vers un service de monitoring
    // console.error('Unhandled error captured by ErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full surface rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Une erreur est survenue</h2>
            <p className="text-sm text-muted mb-4">Désolé, quelque chose s'est mal passé. Rechargez la page ou contactez l'administrateur.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-library-accent text-white rounded">Recharger</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

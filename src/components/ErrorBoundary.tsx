import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Boundary de último recurso: si cualquier pantalla lanza un error inesperado
// durante el render, mostramos esto en vez de dejar que la app entera se
// caiga con la pantalla roja de React Native.
//
// Nota: usa colores fijos (no useColors) a propósito. Si algo se rompió tan
// grave como para llegar aquí, no queremos depender de más contexto de React
// que también pudiera estar en mal estado.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      console.error('Error capturado por ErrorBoundary:', error, info.componentStack);
    }
    // Aquí es donde en el futuro se podría reportar el error a un servicio
    // externo (Sentry, etc.) para monitoreo en producción.
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning-outline" size={32} color="#FF3B30" />
          </View>
          <Text style={styles.title}>Algo salió mal</Text>
          <Text style={styles.subtitle}>
            Ocurrió un error inesperado. Tus datos están a salvo — puedes intentar continuar.
          </Text>
          {__DEV__ && (
            <Text style={styles.debugText} numberOfLines={4}>
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,59,48,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});

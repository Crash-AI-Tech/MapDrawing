'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-full w-full items-center justify-center p-8">
          <div className="max-w-md space-y-4 text-center">
            <h2 className="text-xl font-bold text-destructive">出现了错误</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message ?? '未知错误'}
            </p>
            <Button onClick={this.handleReset} variant="outline">
              重试
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

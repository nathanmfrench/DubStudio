import React, { useEffect } from 'react';
import { facebookService } from './src/services/FacebookService';

// ... other imports

export default function App() {
  useEffect(() => {
    // Initialize Facebook SDK
    try {
      facebookService.initialize();
    } catch (error) {
      console.error('Failed to initialize Facebook SDK:', error);
    }
  }, []);

  // ... rest of your App component
} 
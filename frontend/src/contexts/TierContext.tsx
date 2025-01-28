import React, { createContext, useContext, ReactNode, useState } from 'react';

export type TierType = 'Basic' | 'Premium' | 'Professional' | 'Enterprise';

interface TierData {
  name: TierType;
  monthlyPrice: number;
  features: string[];
  goal: string;
  icon: string;
  availableCredits: number;
}

interface TierContextType {
  currentTier: TierType;
  currentTierData: TierData;
  tiers: {
    [key in TierType]: TierData;
  };
  setCurrentTier: (tier: TierType) => void;
}

const tiers: { [key in TierType]: TierData } = {
  Basic: {
    name: 'Basic',
    monthlyPrice: 9.99,
    features: [
      '15 videos per month',
      'Advanced dubbing, unlimited captions',
      'Views analytics',
    ],
    goal: 'Entry point for individual creators and small businesses',
    icon: 'rocket-launch-outline',
    availableCredits: 15
  },
  Premium: {
    name: 'Premium',
    monthlyPrice: 39,
    features: [
      '100 videos per month',
      'Full scheduling capabilities',
      'Views & Comments Analytics',
    ],
    goal: 'Active content creators or small businesses',
    icon: 'star-outline',
    availableCredits: 100
  },
  Professional: {
    name: 'Professional',
    monthlyPrice: 99,
    features: [
      '300 videos/month',
      'Advanced scheduling & crossposting',
      'Growth recommendations',
      'Account manager',
    ],
    goal: 'Serious content creators',
    icon: 'diamond-stone',
    availableCredits: 300
  },
  Enterprise: {
    name: 'Enterprise',
    monthlyPrice: 199,
    features: [
      'Unlimited videos',
      'Custom API integration',
      'White-label solution',
      'Premium support',
    ],
    goal: 'Large organizations needing custom solutions',
    icon: 'crown',
    availableCredits: 999999
  },
};

const TierContext = createContext<TierContextType>({
  currentTier: 'Professional',
  currentTierData: tiers.Professional,
  tiers,
  setCurrentTier: () => {},
});

export function TierProvider({ children }: { children: ReactNode }) {
  // In a real app, you would fetch the user's current tier from your backend
  const [currentTier, setCurrentTier] = useState<TierType>('Professional');

  return (
    <TierContext.Provider value={{ 
      currentTier, 
      currentTierData: tiers[currentTier],
      tiers, 
      setCurrentTier 
    }}>
      {children}
    </TierContext.Provider>
  );
}

export function useTier() {
  const context = useContext(TierContext);
  if (!context) {
    throw new Error('useTier must be used within a TierProvider');
  }
  return context;
} 
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from './client';

type NeonContext = {
  supabase: ReturnType<typeof createClient>;
};

const Context = createContext<NeonContext | undefined>(undefined);

export default function NeonProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Refresh the page when auth state changes to ensure
      // data is correctly fetched based on the new auth state
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <Context.Provider value={{ supabase }}>
      {children}
    </Context.Provider>
  );
}

export const useNeon = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useNeon must be used inside NeonProvider');
  }
  return context;
};

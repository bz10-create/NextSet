import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "lift_active_workout";

interface ActiveWorkout {
  id: number;
  title: string;
}

interface ActiveWorkoutContextValue {
  activeWorkout: ActiveWorkout | null;
  setActiveWorkout: (id: number, title: string) => void;
  clearActiveWorkout: () => void;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue>({
  activeWorkout: null,
  setActiveWorkout: () => {},
  clearActiveWorkout: () => {},
});

export function ActiveWorkoutProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkout, setActiveWorkoutState] = useState<ActiveWorkout | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setActiveWorkout = useCallback((id: number, title: string) => {
    const value = { id, title };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setActiveWorkoutState(value);
  }, []);

  const clearActiveWorkout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveWorkoutState(null);
  }, []);

  return (
    <ActiveWorkoutContext.Provider value={{ activeWorkout, setActiveWorkout, clearActiveWorkout }}>
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout() {
  return useContext(ActiveWorkoutContext);
}

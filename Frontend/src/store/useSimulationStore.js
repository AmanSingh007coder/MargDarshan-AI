import { create } from 'zustand';

const useSimulationStore = create((set) => ({
  // Playback
  isSimulating:  false,
  playbackSpeed: 1,        // 1 | 2 | 5 | 10

  // Route
  waypoints:    [],        // [{ lat, lng }, ...]
  currentStep:  0,

  // Risk (from FastAPI /predict per step)
  riskScore:    0,
  riskSeverity: 'LOW',     // LOW | MEDIUM | HIGH | CRITICAL

  // Reroute state
  rerouted:   false,       // has auto-reroute fired this journey?
  rerouting:  false,       // API call in flight

  // Actions
  setIsSimulating:  (v)          => set({ isSimulating: v }),
  setPlaybackSpeed: (v)          => set({ playbackSpeed: v }),
  setWaypoints:     (v)          => set({ waypoints: v, currentStep: 0 }),
  setCurrentStep:   (v)          => set({ currentStep: v }),
  setRisk:          (score, sev) => set({ riskScore: score, riskSeverity: sev }),
  setRerouted:      (v)          => set({ rerouted: v }),
  setRerouting:     (v)          => set({ rerouting: v }),
  reset: () => set({
    isSimulating: false, playbackSpeed: 1,
    waypoints: [], currentStep: 0,
    riskScore: 0,  riskSeverity: 'LOW',
    rerouted: false, rerouting: false,
  }),
}));

export default useSimulationStore;

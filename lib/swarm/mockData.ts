// Mock simulation for the swarm visualization
// Uses real agents from the database

// Simulate random agent interactions using a getter for dynamic agent IDs
export function createMockSimulation(
  addConnection: (fromId: string, toId: string) => string,
  updateConnection: (id: string, updates: { status: "completed" | "failed" }) => void,
  removeConnection: (id: string) => void,
  getAgentIds?: () => string[]
) {
  let activeConnections: string[] = [];
  let intervalId: number | null = null;

  const start = () => {
    intervalId = window.setInterval(() => {
      // Get current agent IDs dynamically
      const agentIds = getAgentIds?.() || [];
      if (agentIds.length < 2) return;

      // Randomly complete existing connections
      if (activeConnections.length > 0 && Math.random() > 0.5) {
        const connId = activeConnections[Math.floor(Math.random() * activeConnections.length)];
        const success = Math.random() > 0.1; // 90% success rate
        updateConnection(connId, { status: success ? "completed" : "failed" });
        
        // Remove after animation
        setTimeout(() => {
          removeConnection(connId);
          activeConnections = activeConnections.filter((c) => c !== connId);
        }, 1000);
      }

      // Randomly create new connections
      if (activeConnections.length < 3 && Math.random() > 0.3) {
        const fromIdx = Math.floor(Math.random() * agentIds.length);
        let toIdx = Math.floor(Math.random() * agentIds.length);
        while (toIdx === fromIdx) {
          toIdx = Math.floor(Math.random() * agentIds.length);
        }
        
        const connId = addConnection(agentIds[fromIdx], agentIds[toIdx]);
        activeConnections.push(connId);
      }
    }, 1500);
  };

  const stop = () => {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { start, stop };
}

const AGENTS = Object.freeze({
  care: {
    name: 'ai-care',
    endpoint: '/api/ai-care',
    capabilities: ['customer_support', 'escalation'],
    allowedData: ['question', 'rideSummary', 'customerSummary'],
    riskLevel: 'low'
  },
  guard: {
    name: 'ai-guard',
    endpoint: '/api/ai-guard',
    capabilities: ['security_scan', 'risk_analysis', 'gps_risk'],
    allowedData: ['securitySignals', 'targetSummary', 'locationSummary'],
    riskLevel: 'high'
  },
  executor: {
    name: 'ai-executor',
    endpoint: '/api/ai-executor',
    capabilities: ['approved_action'],
    allowedData: ['approvedTask'],
    riskLevel: 'critical'
  },
  location: {
    name: 'ai-location',
    endpoint: '/api/ai-location',
    capabilities: ['gps_analysis', 'eta', 'hotspot'],
    allowedData: ['locationSummary'],
    riskLevel: 'medium'
  },
  support: {
    name: 'ai-support',
    endpoint: '/api/support-ai',
    capabilities: ['general_support'],
    allowedData: ['question'],
    riskLevel: 'low'
  },
  external: {
    name: 'external-ai',
    gateway: 'external',
    capabilities: ['general_knowledge', 'explanation'],
    allowedData: ['question'],
    riskLevel: 'low',
    isolated: true
  }
});

export function getAgent(name) {
  const agent = AGENTS[String(name || '').toLowerCase()];
  return agent ? { id: String(name).toLowerCase(), ...agent } : null;
}

export function listAgents() {
  return Object.entries(AGENTS).map(([id, agent]) => ({
    id,
    name: agent.name,
    capabilities: [...agent.capabilities],
    allowedData: [...agent.allowedData],
    riskLevel: agent.riskLevel,
    isolated: agent.isolated === true
  }));
}

export function findAgentForCapability(capability) {
  const target = String(capability || '').toLowerCase();
  return listAgents().filter((agent) => agent.capabilities.includes(target));
}

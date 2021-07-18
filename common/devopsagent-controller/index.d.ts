export declare enum AgentState {
    OFFLINE = 1,
    ONLINE = 2
}
export declare enum AgentUserCapabilities {
    ANKA_VM_ID = "ANKA_VM_ID",
    AGENT_IDENTIFIER = "AGENT_IDENTIFIER"
}
export declare class TaskAgent {
    devopsUrl: string;
    agentIdentifier: string;
    agentPoolName: string;
    agentPoolAccessToken: string;
    private agentApi;
    private agent;
    constructor(devopsUrl: string, agentPoolAccessToken: string, agentPoolName: string, agentIdentifier: string);
    setAgentUserCapability(capabilityKey: string, capabilityValue: string): Promise<void>;
    getAgentUserCapability(capabilityKey: string): Promise<string>;
    deleteAgent(): Promise<boolean>;
    awaitAgentState(state: AgentState, numberOfRetries?: number): Promise<boolean>;
    checkAgentExists(): Promise<boolean>;
    private getAgent;
    private getAgentApi;
}

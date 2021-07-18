import tl = require('azure-pipelines-task-lib');
import * as taskAgentI from "azure-devops-node-api/interfaces/TaskAgentInterfaces";
import * as taskAgentApi from "azure-devops-node-api/TaskAgentApi";
import * as nodeApi from "azure-devops-node-api";

export enum AgentState {
    OFFLINE = taskAgentI.TaskAgentStatus.Offline,
    ONLINE = taskAgentI.TaskAgentStatus.Online
}

export enum AgentUserCapabilities {
    ANKA_VM_ID = "ANKA_VM_ID",
    AGENT_IDENTIFIER = "AGENT_IDENTIFIER"
}

function isAgentState(value: any): value is AgentState {
    for (let key in AgentState) {
        if (AgentState[key] === value) {
            return true;
        }
    }
    return false;
}

const enum DevOpsConstants {
    agentNamePrefix = "Anka_VM_"
}

class Agent {
    agentId : number;

    poolId : number;

    capabilities : {[key:string]:string} | undefined;

    status : AgentState | undefined;

    constructor (poolId : number, agentId : number, capabilities? : {[key:string]:string}) {
        this.poolId = poolId;
        this.agentId = agentId;
        this.capabilities = capabilities;
    }
}

export class TaskAgent {
    devopsUrl: string;

    agentIdentifier: string;

    agentPoolName: string;

    agentPoolAccessToken: string;

    private agentApi : taskAgentApi.ITaskAgentApi | undefined = undefined;

    private agent : Agent | undefined = undefined;

    constructor(devopsUrl : string, agentPoolAccessToken : string, agentPoolName : string, agentIdentifier : string) {

        this.devopsUrl = devopsUrl;

        this.agentIdentifier = agentIdentifier;

        this.agentPoolName = agentPoolName;

        this.agentPoolAccessToken = agentPoolAccessToken;

    }

    public async setAgentUserCapability(capabilityKey : string, capabilityValue : string) {
        const agent : Agent = await this.getAgent(true);
        const agentAPI = await this.getAgentApi();

        console.log("Setting Agent Capability to: " + capabilityKey + "=" + capabilityValue);
        if (agent.capabilities) {
            agent.capabilities[capabilityKey] = capabilityValue;
        } else {
            agent.capabilities = {
                [capabilityKey] : capabilityValue
            }
        }
        tl.debug("setting Capabilities:" + JSON.stringify(agent.capabilities));
        await agentAPI.updateAgentUserCapabilities(agent.capabilities,agent.poolId,agent.agentId);
    }

    
    public async getAgentUserCapability(capabilityKey : string) : Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            try {
                const agent : Agent = await this.getAgent(true);
                console.log("Reading Agent Capability: " + capabilityKey);
                tl.debug("Reading from Capabilities:" + JSON.stringify(agent.capabilities));
                if (agent.capabilities && agent.capabilities[capabilityKey]) {
                    console.log("Read Agent Capability-Value: " + agent.capabilities[capabilityKey]);
                    resolve (agent.capabilities[capabilityKey])
                } else {
                    reject("Capability not found!");
                }
            } catch (err) {
                reject(err);
            }
        });
    }
    
    public async deleteAgent() {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                console.log("Deleting Agent...");
                const agent : Agent = await this.getAgent(false, false);
                const agentAPI = await this.getAgentApi();
                agentAPI.deleteAgent(agent.poolId,agent.agentId);
                resolve(true);
            } catch (err) {
                reject(err);
            }
        });
    }

    public async awaitAgentState(state : AgentState, numberOfRetries?: number) : Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
        console.log("Waiting for Agent to reach state " + state);
        let intervalCount : number = 0;
        const interval : NodeJS.Timer = setInterval(async () => {
            let retrySuffix : string = "";
            if (numberOfRetries) {
                intervalCount++;
                if (intervalCount > numberOfRetries) {
                    console.log("Maximum limit of retries reached...");
                    clearInterval(interval);
                    resolve(false);
                } else {
                    retrySuffix = " (Retry attempt " + intervalCount + " of " + numberOfRetries + ")";
                }
            }
            const agentPromise : Promise<Agent> = this.getAgent(false, true);
            agentPromise.then((agent : Agent)=>{
                console.log("Read Agent state " + agent.status + " - comparing to: " + state);
                if (agent.status === state) {
                    console.log("Desired state reached, finishing...");
                    clearInterval(interval);
                    resolve(true);
                } else {
                    console.log("Desired state not reached, retrying..." + retrySuffix);
                }
            },(reason)=>{
                //Ignoring "No Agent found!", since we're waiting for a new agent to appear
                if(reason !== "No Agent found!") {
                    tl.debug("A Problem occured: " + reason);
                    clearInterval(interval);
                    resolve(false);
                } else {
                    console.log("Agent not yet existing, retrying..." + retrySuffix);
                }
            });
            },5000);
        });
    }

    public async checkAgentExists() : Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            console.log("Checking if Agent exists...");
            const agentPromise : Promise<Agent> = this.getAgent(false, false);
            agentPromise.then((agent : Agent)=>{
                console.log("Agent found...");
                resolve(true);
            },(reason)=>{
                console.log("NO Agent found...");
                resolve(false);
            });
        });
    }

    private async getAgent(loadCapabilities : boolean, loadCurrentState? : boolean) : Promise<Agent> {
        return new Promise<Agent>(async (resolve, reject) => {
            try {
                let agentApiObject= await this.getAgentApi();
                if (!this.agent) {
                    let pools : taskAgentI.TaskAgentPool[] = await agentApiObject.getAgentPools(this.agentPoolName);
                    let poolId : number = -1;
                    const searchPoolName = this.agentPoolName;
                    pools.forEach(function(pool) {
                        if (pool.name == searchPoolName) {
                            tl.debug("Analyzing pool: " + pool.name);
                            let id : number|undefined = pool.id;
                            if (id !== undefined) {
                                poolId = id;
                            } 
                            tl.debug("Found Pool-ID: " + poolId);
                        }
                    });
                    if (poolId >= 0) {
                        tl.debug("Searching agent: " + DevOpsConstants.agentNamePrefix + this.agentIdentifier);
                        let agents : taskAgentI.TaskAgent[] = await agentApiObject.getAgents(poolId,DevOpsConstants.agentNamePrefix + this.agentIdentifier);
                        tl.debug("Found " +agents.length + " matching agents in Pool");
                        const searchAgentName = this.agentIdentifier;
                        let foundAgent : Agent | undefined = undefined;
                        agents.forEach(function(agent) {
                            tl.debug("Analyzing agent: " + agent.name + " - " + agent.id);
                            if (agent.name == DevOpsConstants.agentNamePrefix + searchAgentName) {
                                foundAgent = new Agent(poolId, agent.id!);
                            }
                        });
                        if (foundAgent) {
                            tl.debug("Found Agent: " + foundAgent);
                            this.agent = foundAgent;
                        } else {
                            reject("No Agent found!");
                        }
                    }
                }
                if (loadCapabilities && this.agent) {
                    const agentObject : taskAgentI.TaskAgent = await agentApiObject.getAgent(this.agent.poolId,this.agent.agentId,true);
                    this.agent.capabilities = agentObject.userCapabilities;
                    if (isAgentState(agentObject.status)) {
                        this.agent.status = agentObject.status;
                    }
                } else if (loadCurrentState && this.agent) {
                    const agentObject : taskAgentI.TaskAgent = await agentApiObject.getAgent(this.agent.poolId,this.agent.agentId);
                    if (isAgentState(agentObject.status)) {
                        this.agent.status = agentObject.status;
                    }
                }
            } catch (err) {
                reject(err);
            }

            resolve(this.agent!);
        });
    }

    private async getAgentApi(): Promise<taskAgentApi.ITaskAgentApi> {
        return new Promise<taskAgentApi.ITaskAgentApi>(async (resolve, reject) => {
            try {
                if (this.agentApi) {
                    resolve(this.agentApi);
                } else {
                    let authHandler = nodeApi.getPersonalAccessTokenHandler(this.agentPoolAccessToken);
                    let option = undefined;
                    let webApi = new nodeApi.WebApi(this.devopsUrl, authHandler, option);
                    await webApi.connect();
                    resolve(webApi.getTaskAgentApi());
                }
            } catch (err) {
                reject(err);
            }
        });
    }
}


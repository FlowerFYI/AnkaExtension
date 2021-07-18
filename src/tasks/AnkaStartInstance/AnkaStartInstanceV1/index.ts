/*
Copyright 2021 www.flower.fyi
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import tl = require('azure-pipelines-task-lib');
import path = require('path');
import anka = require('anka-controller');
import devops = require('devopsagent-controller');


class TaskOptions {

    ankaVM : anka.AnkaVM;

    devopsAgent : devops.TaskAgent;

    ankaVmName : string = "";

    constructor() {
        // tl.getInput will throw on undefined ankaControllerEndpoint, so no risk in forcing non-null through "!"
        const ankaControllerEndpoint = tl.getInput('ankaControllerEndpoint', true)!;
        // tl.getEndpointUrl will throw on undefined ankaControllerEndpointUrl, so no risk in forcing non-null through "!"
        const ankaControllerEndpointUrl = tl.getEndpointUrl(ankaControllerEndpoint, false)!;
        tl.debug('ankaControllerEndpointUrl=' + ankaControllerEndpointUrl);

        const ankaAgentUser = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentUser", false);
        const ankaAgentPath = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentPath", false);
        const ankaAgentScript = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentScript", false);
        const ankaAgentLogs = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentLogs", false);
        let ankaAgentProxy = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentProxy", true);
        if (ankaAgentProxy) {
            ankaAgentProxy = "--proxyurl " + ankaAgentProxy;
        }

        // tl.getEndpointDataParameter will throw on undefined ankaAgentPoolName, so no risk in forcing non-null through "!"
        const agentPoolName = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentPoolName", false)!;

        // tl.getEndpointDataParameter will throw on undefined ankaAgentPoolAccessToken, so no risk in forcing non-null through "!"
        const agentPoolAccessToken = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentPoolAccessToken", false)!;

        // tl.getInput will throw on undefined ankaAgentIdentifier, so no risk in forcing non-null through "!"
        const agentIdentifier = tl.getInput('ankaAgentIdentifier', true)!;

        // tl.getInput will throw on undefined ankaVmName, so no risk in forcing non-null through "!"
        const ankaVmName = tl.getInput('ankaVmName', true)!;

        // tl.getInput will throw on undefined ankaVmTag, so no risk in forcing non-null through "!"
        const ankaVmTag = tl.getInput('ankaVmTag', true)!;

        const agentDevOpsUrl = process.env["SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"];
        const agentDevOpsBuildUrl = process.env["SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"] + "/" + process.env["SYSTEM_TEAMPROJECT"] + "/_build/results?buildId=" + process.env["BUILD_BUILDID"];

        const ankaStartupScript="sudo -u " + ankaAgentUser + " -i -n AGENT_DIR=" + ankaAgentPath + " " + ankaAgentScript + " --unattended "+ ankaAgentProxy + " --url " + agentDevOpsUrl + " --auth pat --token " + agentPoolAccessToken + " --pool \""+ agentPoolName + "\" --agent \"Anka_VM_" + agentIdentifier + "\" --acceptTeeEula > " + ankaAgentLogs + "/agent.log 2>&1";

        this.ankaVM = new anka.AnkaVM(ankaControllerEndpointUrl,true);
        this.ankaVM.setStartupParametersByName(ankaVmName, ankaVmTag, ankaStartupScript, agentIdentifier, agentDevOpsBuildUrl);

        this.devopsAgent = new devops.TaskAgent(agentDevOpsUrl!,agentPoolAccessToken,agentPoolName,agentIdentifier);

    }
}

async function doWork() {
    try {
        tl.setResourcePath(path.join( __dirname, 'task.json'));

        console.log("Initializing provisioning of Anka VM");

        const taskOptions: TaskOptions = new TaskOptions();

        if(await taskOptions.ankaVM.readVmUuidForName()) {
            if(await taskOptions.ankaVM.submitProvisioning()) {
                tl.debug("Resolved VMID:" + taskOptions.ankaVM.instanceUuid);
                tl.debug("Resolved type:" + typeof taskOptions.ankaVM.instanceUuid);
               
                if (await taskOptions.ankaVM.awaitState(anka.AnkaState.STARTED, anka.AnkaSubState.RUNNING)) {
    
                    let checkCycleCount :  number = 0;
                    let currentAgentState : boolean = false;
                    while (checkCycleCount < 5 && !currentAgentState) {
                        currentAgentState = await taskOptions.devopsAgent.awaitAgentState(devops.AgentState.ONLINE, 15);
                        if (currentAgentState) {
                            await taskOptions.devopsAgent.setAgentUserCapability(devops.AgentUserCapabilities.ANKA_VM_ID,taskOptions.ankaVM.instanceUuid);
                            await taskOptions.devopsAgent.setAgentUserCapability(devops.AgentUserCapabilities.AGENT_IDENTIFIER, taskOptions.devopsAgent.agentIdentifier);
                        } else {
                            console.log("Agent did not appear within Retry-Limit, checking Anka VM for failures...");
                            checkCycleCount++;
                            if (!await taskOptions.ankaVM.awaitState(anka.AnkaState.STARTED, anka.AnkaSubState.RUNNING)) {
                                console.log("Anka VM has left running State, terminating VM!");
                                if (await taskOptions.ankaVM.submitTermination()) {
                                    if (await taskOptions.ankaVM.awaitState(anka.AnkaState.TERMINATED)) {
                                        if (await taskOptions.devopsAgent.checkAgentExists()) {
                                            await taskOptions.devopsAgent.deleteAgent();
                                        } else {
                                            console.log("Agent not created, nothing to delete!");
                                        }
                                    } else {
                                        throw new Error("Anka VM did not terminate!");
                                    }
                                } else {
                                    throw new Error("Could not submit Termination!");
                                }
                                throw new Error("Aborting because of failed Anka VM!");
                            }
                        }
                    }
                    if (!currentAgentState) {
                        throw new Error("Agent did not reach a running state!");
                    }
                } else {
                    throw new Error("Anka VM did not reach a running state!");
                }
            } else {
                throw new Error("Could not provision Anka VM!");
            }
        } else {
            throw new Error("Could not get Image-Uuid for Image-Name!");
        }

        tl.setResult(tl.TaskResult.Succeeded, "Anka VM successfully started");
    } catch (e) {
        tl.debug(e.message);
        tl.setResult(tl.TaskResult.Failed, e.message);
    }
}

doWork();

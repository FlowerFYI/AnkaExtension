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

    constructor() {
        // tl.getInput will throw on undefined ankaControllerEndpoint, so no risk in forcing non-null through "!"
        const ankaControllerEndpoint = tl.getInput('ankaControllerEndpoint', true)!;
        // tl.getEndpointUrl will throw on undefined ankaControllerEndpointUrl, so no risk in forcing non-null through "!"
        const ankaControllerEndpointUrl = tl.getEndpointUrl(ankaControllerEndpoint, false)!;
        tl.debug('ankaControllerEndpointUrl=' + ankaControllerEndpointUrl);


        // tl.getEndpointDataParameter will throw on undefined ankaAgentPoolName, so no risk in forcing non-null through "!"
        const agentPoolName = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentPoolName", false)!;

        // tl.getEndpointDataParameter will throw on undefined ankaAgentPoolAccessToken, so no risk in forcing non-null through "!"
        const agentPoolAccessToken = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentPoolAccessToken", false)!;

        // tl.getInput will throw on undefined ankaAgentIdentifier, so no risk in forcing non-null through "!"
        const agentIdentifier = tl.getInput('ankaAgentIdentifier', true)!;

        const agentDevOpsUrl : string|undefined = process.env["SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"];

        this.ankaVM = new anka.AnkaVM(ankaControllerEndpointUrl,true);
        this.ankaVM.setStopParametersByName(agentIdentifier);

        this.devopsAgent = new devops.TaskAgent(agentDevOpsUrl!,agentPoolAccessToken,agentPoolName,agentIdentifier);
    
    }
}

async function doWork() {
    try {
        tl.setResourcePath(path.join( __dirname, 'task.json'));

        console.log("Initializing termination of Anka VM");

        const taskOptions: TaskOptions = new TaskOptions();

        if (! await taskOptions.ankaVM.readInstanceUuidForName()) {
            taskOptions.ankaVM.instanceUuid = await taskOptions.devopsAgent.getAgentUserCapability(devops.AgentUserCapabilities.ANKA_VM_ID);
        }

        const agentDeletion = taskOptions.devopsAgent.deleteAgent();

        if (await taskOptions.ankaVM.submitTermination()) {
            if (! await taskOptions.ankaVM.awaitState(anka.AnkaState.TERMINATED, undefined, true)) {
                throw new Error("Anka VM did not terminate!");
            }
        } else {
            throw new Error("Could not submit Termination!");
        }

        if (! await agentDeletion) {
            throw new Error("Could not delete Agent!");
        }

        tl.setResult(tl.TaskResult.Succeeded, "Anka VM successfully terminated");
    } catch (e) {
        tl.debug(e.message);
        tl.setResult(tl.TaskResult.Failed, e.message);
    }
}

doWork();

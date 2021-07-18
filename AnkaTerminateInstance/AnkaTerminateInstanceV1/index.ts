import tl = require('azure-pipelines-task-lib');
import path = require('path');
import anka = require('./common/anka');
import devops = require('./common/devops');

class TaskOptions {

    ankaVM : anka.AnkaVM;
    
    devopsAgent : devops.TaskAgent;

    constructor() {
        const ankaControllerEndpoint = tl.getInput('ankaControllerEndpoint', true);
        const ankaControllerEndpointUrl = tl.getEndpointUrl(ankaControllerEndpoint, false);
        tl.debug('ankaControllerEndpointUrl=' + ankaControllerEndpointUrl);


        const agentPoolName = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentPoolName", false);
        const agentPoolAccessToken = tl.getEndpointDataParameter(ankaControllerEndpoint, "ankaAgentPoolAccessToken", false);

        const agentIdentifier = tl.getInput('ankaAgentIdentifier', true);

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

/*
Copyright 2021 www.flower.fyi
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import tl = require('azure-pipelines-task-lib');
import request = require('request');

export const enum AnkaState {
    STARTED = "Started",
    TERMINATED = "Terminated"
}

export const enum AnkaSubState {
    RUNNING = "running",
    FAILED = "failed"
}

const enum AnkaConstants {
    controllerApiUrlSuffix = '/api/v1/vm',
    registryApiUrlSuffix = '/api/v1/registry/vm',
    requestVmid = 'vmid',
    requestTag = 'tag',
    requestId = 'id',
    requestStartupScript = 'startup_script',
    requestName = 'name',
    requestExternalId = 'external_id'
}


export class AnkaVM {
    controllerApiUrl: string;

    registryApiUrl: string;

    vmUuid: string = "";

    vmName: string = "";

    vmTag: string = "";

    startupScript: string = "";

    instanceUuid: string = "";

    instanceName: string = "";

    instanceExternalId: string = "";

    strictSSL : boolean = true; 

    constructor(ankaControllerUrl : string, useStrictSSL : boolean) {
        tl.debug("Setting up Anka-environment...");

        this.controllerApiUrl = new URL(ankaControllerUrl + AnkaConstants.controllerApiUrlSuffix).toString();
        tl.debug("Using Controller-API-URL: " + this.controllerApiUrl);

        this.registryApiUrl = new URL(ankaControllerUrl + AnkaConstants.registryApiUrlSuffix).toString();
        tl.debug("Using Registry-API-URL: " + this.registryApiUrl);

        this.strictSSL = useStrictSSL;
    }

    public setStopParametersByName (instanceName : string) {
        this.instanceName = instanceName;
    }

    public setStartupParametersByUuid (ankaVmUuid : string, ankaVmTag : string, ankaStartupScript : string, instanceName : string, instanceExternalId : string) {
        this.vmUuid = ankaVmUuid;
        this.vmTag = ankaVmTag;
        this.startupScript = ankaStartupScript;
        this.instanceName = instanceName;
        this.instanceExternalId = instanceExternalId;
    }

    public setStartupParametersByName (ankaVmName : string, ankaVmTag : string, ankaStartupScript : string, instanceName : string, instanceExternalId : string) {
        this.vmName = ankaVmName;
        this.vmTag = ankaVmTag;
        this.startupScript = ankaStartupScript;
        this.instanceName = instanceName;
        this.instanceExternalId = instanceExternalId;
    }

    public readVmUuidForName (): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                console.log("Reading Anka-VM-Uuid for " + this.vmName);
                request.get(this.registryApiUrl, (err : any, httpResponse : any, body : any) => {
                    tl.debug('readVmUuidForName()');
                    tl.debug('Response:' + JSON.stringify(httpResponse));
                    tl.debug('Body:' + JSON.stringify(body));
                    tl.debug('Error:' + err);
        
                    if (err) {
                        tl.debug(err);
                        resolve(false);
                    }
        
                    const result = JSON.parse(body);

                    if (result.body && Array.isArray(result.body)) {
                        tl.debug('VM-Image Count: ' + result.body.length);
                        for (let i = 0; i < result.body.length; i++) {
                            tl.debug('Checking VM-Image: ' + result.body[i].name + ' comparing to: ' + this.vmName);
                            if (result.body[i].name   === this.vmName) {
                                console.log("Found Anka-VM-Uuid: " + result.body[i].id);
                                this.vmUuid = result.body[i].id
                                resolve(true);
                                break; 
                            }
                        }
                    } else {
                        tl.debug('Response did not contain an Array of Images!!');
                    }
                    resolve(false);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    public readInstanceUuidForName (): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                console.log("Reading Anka-Instance-Uuid for " + this.instanceName);
                request.get(this.controllerApiUrl, (err : any, httpResponse : any, body : any) => {
                    tl.debug('readInstanceUuidForName()');
                    tl.debug('Response:' + JSON.stringify(httpResponse));
                    tl.debug('Body:' + JSON.stringify(body));
                    tl.debug('Error:' + err);
        
                    if (err) {
                        tl.debug(err);
                        resolve(false);
                    }
        
                    const result = JSON.parse(body);

                    if (result.body && Array.isArray(result.body)) {
                        tl.debug('VM-Instance Count: ' + result.body.length);
                        for (let i = 0; i < result.body.length; i++) {
                            tl.debug('Checking VM-Instance: ' + result.body[i].name + ' comparing to: ' + this.instanceName);
                            if (result.body[i].name   === this.instanceName) {
                                console.log("Found Anka-Instance-Uuid: " + result.body[i].instance_id);
                                this.instanceUuid = result.body[i].instance_id
                                resolve(true);
                                break; 
                            }
                        }
                    } else {
                        tl.debug('Response did not contain an Array of Images!!');
                    }
                    resolve(false);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    public submitProvisioning(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                console.log("Starting provisioning of Anka-VM for " + this.vmUuid + " with Tag " + this.vmTag);
                tl.debug('submitJob(): ' + JSON.stringify(this));
                const ankaProvisionPostData: any = 
                {
                    url: this.controllerApiUrl,
                    json: true,
                    body: {
                        [AnkaConstants.requestVmid] : this.vmUuid,
                        [AnkaConstants.requestTag]: this.vmTag,
                        [AnkaConstants.requestName] : this.instanceName,
                        [AnkaConstants.requestExternalId]: this.instanceExternalId,
                        [AnkaConstants.requestStartupScript] : Buffer.from(this.startupScript).toString('base64')
                    },
                    strictSSL: this.strictSSL
                }
            
                tl.debug('ankaProvisionPostData = ' + JSON.stringify(ankaProvisionPostData));

                request.post(ankaProvisionPostData, (err : any, httpResponse : any, body : any) => {
                    tl.debug('submitProvisionVM().ankaProvisionRequestCallback(ankaProvisionPostData)');
                    tl.debug('Response:' + JSON.stringify(httpResponse));
                    tl.debug('Body:' + JSON.stringify(body));
                    tl.debug('Error:' + err);
                    if (err) {
                        tl.debug('Found error');
                        tl.debug(err);
                        reject(err);
                    } else if (httpResponse.statusCode === 200) {
                        console.log("Anka-Provisioning successfully triggered...");
                        tl.debug('success');
                        if (body.body instanceof Array && body.body.length > 0) {
                            tl.debug('VMID(Array):' + body.body[0]);
                            this.instanceUuid = body.body[0]
                            resolve(true);
                        } else if (typeof body.body === "string") {
                            tl.debug('VMID(string):' + body.body[0]);
                            this.instanceUuid = body.body[0];
                            resolve(true);
                        } else {
                            reject("No valid response found:" + JSON.stringify(httpResponse));
                        }  
                    } else {
                        tl.debug('Error (http-response-code): ' + httpResponse.statusCode);
                        tl.debug('Error (received content): ' + body);
                        reject("An error occured: " + httpResponse.statusCode );
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }
    
    public async awaitState(state : AnkaState, substate? : AnkaSubState, acceptAbsence : boolean = false) : Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
        console.log("Waiting for Anka-VM to reach state '" + state + "' and substate '" + substate +  "'...");
        const interval : NodeJS.Timer = setInterval(() => {
            request.get(this.controllerApiUrl + "?" + AnkaConstants.requestId + "=" + this.instanceUuid, (err : any, httpResponse : any, body : any) => {
                tl.debug('awaitVMState()');
                tl.debug('Response:' + JSON.stringify(httpResponse));
                tl.debug('Body:' + JSON.stringify(body));
                tl.debug('Error:' + err);
    
                if (err) {
                    tl.debug(err);
                    clearInterval(interval);
                    resolve(false);
                }
    
                const result = JSON.parse(body);
    
                let foundState, foundSubstate : string = "";
    
                if (result.body && result.body.instance_state) {
                    console.log('Found State: ' + result.body.instance_state + " - comparing to: " + state);
                    foundState = result.body.instance_state;
                }
                if (result.body && result.body.vminfo && result.body.vminfo.status) {
                    if (substate) {
                        console.log('Found SubState: ' + result.body.vminfo.status + " - comparing to: " + substate);
                    }
                    foundSubstate = result.body.vminfo.status;
                }

                let vmNotFound : boolean = false;
                if (result.status === "FAIL" && result.message === "Not found" ) {
                    tl.debug('Request FAIL with Not Found -> VM No longer exitst!');
                    vmNotFound = true;
                }
    
                if (foundSubstate === AnkaSubState.FAILED) {
                    console.log("Found failed VM, aborting!");
                    clearInterval(interval);
                    resolve(false);
                } else if (foundState === state && (!substate || foundSubstate === substate)) {
                    console.log("Desired state reached, finishing...");
                    clearInterval(interval);
                    resolve(true);
                } else if (vmNotFound) {
                    console.log("VM no longer existent / not found...");
                    if (acceptAbsence) {
                        console.log("Non-Existence is an accepted state, finishing...");
                        clearInterval(interval);
                        resolve(true);
                    } else {
                        console.log("Non-Existence is NOT an accepted state, aborting!");
                        clearInterval(interval);
                        resolve(false);
                    }
                }
                console.log("Desired state not reached, retrying...");
            });
            },5000);
        });
    }
    
    public submitTermination(): Promise<boolean> {
    
        return new Promise<boolean>(async (resolve, reject) => {
    
            console.log("Starting Termination of Anka-VM  " + this.instanceUuid);
            tl.debug('submitJob(): ' + JSON.stringify(this));
    
            const ankaTerminateDeleteData: any = 
            {
                url: this.controllerApiUrl,
                json: true,
                body: {
                    [AnkaConstants.requestId]: this.instanceUuid
                },
                strictSSL: true
            }
    
            tl.debug('ankaProvisionPostData = ' + JSON.stringify(ankaTerminateDeleteData));
    
            request.delete(ankaTerminateDeleteData, (err : any, httpResponse : any, body : any) => {
                tl.debug('submitTerminateVM().ankaTerminateRequestCallback(ankaProvisionPostData)');
                tl.debug('Response:' + JSON.stringify(httpResponse));
                tl.debug('Body:' + JSON.stringify(body));
                tl.debug('Error:' + err);
                if (err) {
                    tl.debug('Found error');
                    tl.debug(err);
                    reject(err);
                } else {
                    console.log("Anka-Termination successfully triggered...");
                    tl.debug('success');
                    tl.debug('VMID:' + body.body);
                    resolve(true);
                }
            });
        });
    }
}

external
The dev machine needs to run Node v10.21.0 to ensure that the code written is compatible with the production environment on the agent and the latest non-preview version of azure-pipelines-task-lib.

npm install -g typescript@4.0.2
npm i -g tfx-cli@0.9.2
npm i -g install-local@3.0.1

internal

The agent doesn't automatically install the required modules because it's expecting your task folder to include the node modules. To mitigate this, copy the node_modules to buildandreleasetask. As your task gets bigger, it's easy to exceed the size limit (50MB) of a VSIX file. Before you copy the node folder, you may want to run npm install --production or npm prune --production, or you can write a script to build and pack everything.




build:

tsc in common

copy common to AnkaProvisionVM/AnkaProvisionVM1/common
copy common to AnkaProvisionVM/AnkaProvisionVM2/common

copy common to AnkaTerminateVM/AnkaTerminateVM1/common


tsc in AnkaProvisionVM/AnkaProvisionVM1
tsc in AnkaProvisionVM/AnkaProvisionVM2

tsc in AnkaTerminateVM/AnkaTerminateVM1

tfx extension create
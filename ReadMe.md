# Azure DevOps Extension for Veertu Anka Build Cloud
This repository contains the code for the open source version of the Azure DevOps Extension for Veertu Anka Build Cloud.
A more extensive read-me will be provided soon.
At the moment this read-me focusses on setting up the environment for building the plugin and the structure of the code.

## Global installations required for building
The following tools need to be installed globally:
- Node v10.21.0: This is the Node version the Azure DevOps extension will run in production
- Typescript 4.0.2: This is the recommended Typescript version for Azure DevOps extensions (*npm install -g typescript@4.0.2*)
- TFX-CLI 0.9.2: This is the cli interface used to package the extension (*npm install -g tfx-cli@0.9.2*)
- install-local 3.0.1: This package is used for shared code in the tasks (*npm install -g install-local@3.0.1*)
  - The main code of this Azure DevOps extension is centralized in two common code modules which are referenced and used by the actual tasks. Since the dependency management for Azure DevOps extensions is done through npm, those are handled as node modules. But since there is no need to publish those core modules somewhere they're only installed locally. Under normal circumstances this could be done but using the natice function of npm for referencing local modules, but this function relies on softlinks and the packaging task of the TFX-CLI needs everything to be included directly in the task's directory. To solve this problem, I'm using install-local which (in the background) actually packs and installs the local dependency into the current module.

## Code structure
- extension
  - Everything needed to package the actual Azure DevOps Extension see [ReadMe.md](/extension/ReadMe.md) there for more information.
- src
  - common
    - anka-controller
      - Shared core-module containing all interations with the Anka Controller and Registry, see [ReadMe.md](/src/common/anka-controller/ReadMe.md) there for more information.
    - devopsagent-controller
      - Shared core-module containing all interations with the Azure DevOps Agent, see [ReadMe.md](/src/common/devopsagent-controller/ReadMe.md) there for more information.
  - tasks
    - AnkaStartInstance/AnkaStartInstanceV1
      - The V1-version of the actual task to start an Anka Instance from an Azure DevOps pipeline, see [ReadMe.md](/src/tasks/AnkaStartInstance/AnkaStartInstanceV1/ReadMe.md) there for more information.
    - AnkaTerminateInstance/AnkaTerminateInstanceV1
      - The V1-version of the actual task to start an Anka Instance from an Azure DevOps pipeline, see [ReadMe.md](/src/tasks/AnkaTerminateInstance/AnkaTerminateInstanceV1/ReadMe.md) there for more information.

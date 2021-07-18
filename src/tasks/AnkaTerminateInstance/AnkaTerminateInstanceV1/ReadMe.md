# Build commands
This package currently provides the following build commands:

## For endusers

### update-common
`npm run update-common` 
Runs "install-local" to update the shared code of the referenced local modules.

### compile
`npm run compile` 
Runs "update-common" and compiles through Typescript (TSC).

### start
`npm start` 
Runs "compile, sources the "task_test.env" and starts the index.js through Node with the environment.

## For internal usage

### prepare-extension
`npm run prepare-extension` 
Run from the extension creation script to provide a cleaner build by running a "npm prune --production" and then calling "compile".

## Preparing your environment
The task needs a lot of environment-variables to run locally.
For this purpose there is a "task_test.template" provided which must be copied to "task_test.env" and then filled with the needed environment-variables.
** ATTENTION: Never enter any secrets / personal information into "task_test.template" and never commit "task_test.env" (it's in the .gitignore)**


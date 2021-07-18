# Build commands
This package currently provides the following build commands:

## For endusers

### build-extension
`npm run build-extension` 
Calls "prepare-tasks" and then builds the extension through TFX.

# For internal usage

### prepare-startinstance-v1
`npm run prepare-startinstance-v1` 
Runs "prepare-extension" inside the directory of src/tasks/AnkaStartInstance/AnkaStartInstanceV1.

### prepare-startinstance
`npm run prepare-startinstance` 
Runs "prepare-startinstance-v1".

### prepare-terminateinstance-v1
`npm run prepare-terminateinstance-v1` 
Runs "prepare-extension" inside the directory of src/tasks/AnkaTerminateInstance/AnkaTerminateInstanceV1.

### prepare-terminateinstance
`npm run prepare-terminateinstance` 
Runs "prepare-terminateinstance-v1".

### prepare-tasks
`npm run prepare-tasks` 
Runs "prepare-startinstance" and "prepare-terminateinstance".


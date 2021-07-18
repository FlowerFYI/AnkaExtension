# Build commands
This package currently provides the following build commands:

## For internal usage

### prepack
`npm run prepack` 
The "prepack" lifecycle-hook is automatically run on every packaging of the module. Performs a "npm install" and then compiles through Typescript (TSC).

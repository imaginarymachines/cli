# Plugin Machine CLI

Command line interface for [Plugin Machine](https://pluginmachine.com).

- ![npm](https://img.shields.io/npm/v/plugin-machine?style=flat-square)
- [![Tests](https://github.com/imaginarymachines/plugin-machine-cli/actions/workflows/node.js.yml/badge.svg)](https://github.com/imaginarymachines/plugin-machine-cli/actions/workflows/node.js.yml)
## Install

- Install globally, which is recommended:
    - `npm i plugin-machine -g`
- Install as a dependency of plugin:
    - `npm i plugin-machine`
- Use via npx
    - `npx plugin-machine login`

## Commands

### Login
- Login to plugin machine.
    - `plugin-machine login {token}`
    - [When logged in, go to /dashboard/api](https://pluginmachine.app/dashboard/api) to see API token.

### Plugin
> These Commands Require login

All `plugin` commands will assume that the current directory is the root directory of the plugin. You may pass a different directory with --pluginDir flag: `plugin-machine plugin add --pluginDir=../something`.

#### Write pluginMachine.json for a plugin

- Update pluginMachine.json
    - `plugin-machine plugin config`
- Download pluginMachine.json for a plugin
    - `plugin-machine plugin config --pluginId=7`

#### Add a feature to current plugin

- `plugin-machine plugin add`

#### Build plugin

This command runs any npm or composer commands found in pluginMachine.json's "buildSteps" key.

- Prepare for a production-ready, installable zip.
  - `plugin-machine plugin build`
#### ZIP plugin for release
- Zip files, based on pluginMachine.json's "buildIncludes" key.
  - `plugin-machine plugin zip`


### Debug
- Output some debug information
	- `plugin-machine debug`

### Get Version
- Output some debug information
	- `plugin-machine version`

### Docker

Docker shortcuts:

- Kill all Docker containers running on the machine:
    - `plugin-machine docker kill`
    - Runs: `docker kill $(docker ps -q)`

## Development


### Required

- Node.js 14+

### Commands


  - `npm start`
    - run cli
  - `npm run dev`
    - run force debug cli
  - `npm run type-check`
    - run type-check and lint
  - `npm run lint`
    - run type-check and lint, fixing fixable errors
  - `npm run build`
    - run swc
      - this only development, not production
  - `npm run test`
    - launches test runner by watch mode
  - `npm run test:ci`
    - Runs tests for CI, IE once, not a watcher.
  - `npm run coverage`
    - ~~get coverage report~~

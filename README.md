# Plugin Machine CLI

Command line interface for [Plugin Machine](https://pluginmachine.com).

## Install


## Commands

### Login
- Login to plugin machine.
    - `plugin-machine login {token}`
    - [When logged in, go to /dashboard/user](https://pluginmachine.app/dashboard/user) to see API token.

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

#### ZIP plugin for release
- `plugin-machine plugin zip`

### Debug
- Output some debug information
	- `plugin-machine debug`

## Development

- Git clone
    - `git@github.com:imaginarymachines/plugin-machine-cli.git`
- Install
    - `yarn`

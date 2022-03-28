
import arg from 'arg';
import inquirer from 'inquirer';
import { getAuthToken, getPluginDir, getPluginMachineJson} from '../lib/config';
import {
  error,
  important,
  info,
  success,
} from '../lib/log';

import pluginMachineApi from '../lib/pluginMachineApi';
import {FF_ZIP_UPLOADS,isFeatureFlagEnabled}from '../lib/flags'
import { exitError, exitSuccess } from '../lib/docker/exit';
import {createDockerApi}from '../lib/docker/docker';

function parseArgumentsIntoOptions(rawArgs) {
//https://www.npmjs.com/package/arg
  const args = arg(
    {
      '--pluginId': String,
      '--feature': String,
      '--pluginDir': String,
      '--appUrl': String,
      '--token': String,
      '--phpVersion': String,
      '--nodeVersion': String,
      '--buildDir': String,
      '--fileName': String,
      '--filePath': String,
      // Aliases
    },
    {
      argv: rawArgs.slice(2),
    }
  );
  return {
    command: args._[1] || false,
    feature: args['--feature'] || false,
    pluginId: args['--pluginId'] || args._[2] || false,
    pluginDir: args['--pluginDir'] || false,
    appUrl: args['--appUrl'] || false,
    token: args['--token'] || false,
    phpVersion: args['--phpVersion'] || false,
    nodeVersion: args['--nodeVersion'] || false,
    buildDir: args['--buildDir'] || false,
    fileName: args['--fileName'] || false,
    filePath: args['--filePath'] || false,

  };
}
async function promptForFeature(options,features) {
  const questions = [];

  const hasFeature = (rule) => {
    return features.hasOwnProperty(rule);
  }
  const getFeatureChoices = () => {
    return Object.keys(features).map(feature => {
      return {
        name: features[feature].feature.singular,
        value: feature,
      }
    });
  }

  if( 'string' !== typeof options.feature || !hasFeature(options.feature) ) {
    questions.push({
      type: 'list',
      name: 'feature',
      message: 'What type of feature would you like to add?',
      choices:getFeatureChoices(),
    });
    options = await promptForMissingOptions(options,questions);
  }

  return options;
}

async function promptForZipOptions(options) {
  const questions = [{
    type: 'list',
    name: 'version',
    message: 'Would you like to create a new release?',
    choices:[
      {
        name: 'NO',
        value: false,
      },
      {
        value: 'patch',
        name: 'Yes, a patch release',
      },
      {
        name: 'Yes, a minor release',
        value: 'minor',
      },
      {
        name: 'Yes, a major release',
        value: 'release',
      },
    ]
  }];

  options = await promptForMissingOptions(options,questions);


  return options;
}

async function promptForFeatureRules(options,allRules) {
  const {feature} = options;
  const questions = [];
  if( ! allRules.hasOwnProperty(feature) ) {
    throw new Error(`Feature ${feature} not found`);
    return;
  }
  Object.keys(allRules[feature]).forEach(rule => {
    const {label,options,rules} = allRules[feature][rule];

    if( null !== options ) {
        questions.push({
          type: 'list',
          name: rule,
          message: label,
          choices:Object.keys(options).map(option => {
            return {
              value:options[option],
              name:option,
            }
          }),
        });
    }else if( 'string' === rules[0] ) {
      questions.push({
        type: 'prompt',
        name: rule,
        message: label,
      });
    }
  });

  options = await promptForMissingOptions(options,questions);

  return options;
}

async function promptForMissingOptions(options,questions) {
  if( questions.length ) {
    const answers = await inquirer.prompt(questions);
    options= Object.assign(options, answers);
  }
  return options;
}

/**
 * Hander for `plugin-machine plugin config` command
 */
async function handleConfig(pluginDir,pluginId,pluginMachine) {
  const fs = require('fs');
  let newPluginMachineJson = await pluginMachine.getPluginMachineJson(pluginId);
  fs.writeFileSync(`${pluginDir}/pluginMachine.json`, JSON.stringify(newPluginMachineJson, null, 2));
  return true;
}


/**
 * Hander for `plugin-machine plugin add` command
 */
async function handleAddFeature(pluginDir,pluginMachine,pluginMachineJson,options){
  const {feature} = options;
  const data = {};
  const badKeys = ['command','feature','pluginId'];
  Object.keys(options).forEach( option => {
    if( -1 == badKeys.indexOf(option) ) {
      if( 'string' === typeof options[option] ) {
        data[option] = options[option].toLowerCase();
      }
    }
  });
  data.featureType = feature;

  let {featureId,files,main} = await pluginMachine.addFeature(pluginMachineJson,data).catch(e => {
      throw new Error(e);
  });
  info( `Saved new ${feature} feature with id ${featureId}`);

  const promises = [];
  if( files.length ){
    files.forEach(async(file) => {
      let fileContents = await pluginMachine.getFeatureCode(pluginMachineJson,featureId,file);
      promises.push(
        await pluginMachine.writeFile(pluginDir,file,fileContents).catch(e => {
            throw new Error(e);
        }).then(() => {
          info(`Added ${file}`);
        })
      )});
  }

  const outputMain = async () => {
    if( main && main.length ){
      important( 'IMPORTANT!')
      important( 'You must add this to the main file of your plugin:')
      if( Array.isArray(main)){
        main.forEach(main => {
          important( main);
        });
      }else if( 'string' === typeof main ){
        important( main );
      }
    }
  }
  Promise.all(promises).then(outputMain);

}

//Make sure we have a token
const checkLogin = (token) => {
  if( ! token ) {
    throw new Error('No token found, you must be logged in to use this command');
  }
  return token;
}

const validatePluginJson = (pluginMachineJson) => {
  if( ! pluginMachineJson.pluginId ) {
    throw new Error('No pluginId found in pluginMachine.json');
  }
  if( ! pluginMachineJson.buildId ) {
    throw new Error('No buildId found in pluginMachine.json');
  }
  return pluginMachineJson;
}

const makeDockerArgs = (options,pluginDir,pluginMachineJson) => {
  let args =  {
    pluginDir,
    appUrl:pluginMachineJson.appUrl
  }
  if( options.phpVersion){
    args['phpVersion'] = options.phpVersion;
  }
  if( options.nodeVersion){
    args['nodeVersion'] = options.nodeVersion;
  }
  return args;
}
/**
 * Hander for `plugin-machine plugin {command}` commands
 */
export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  const pluginDir = options.pluginDir || getPluginDir();
  //Set appUrl from options
  const appUrl = options.appUrl ? options.appUrl : 'https://pluginmachine.app';
  let pluginMachineJson = getPluginMachineJson(pluginDir,{
      appUrl
  });
  const pluginMachine = await pluginMachineApi(
    checkLogin(options.token || getAuthToken(pluginDir)),
  );
  const dockerApi = await createDockerApi(makeDockerArgs(options,pluginDir,pluginMachineJson))
    .catch(e => {exitError({errorMessage: 'Error connecting to docker'})});

  const buildDir = options.buildDir || null;

  switch (options.command) {
    case 'config':
      await handleConfig(
        pluginDir,
        options.pluginId || pluginMachineJson.pluginId,
        pluginMachine
      ).catch((e) => error(e))
      .then( () => success('Plugin Machine config saved'));
      break;

    case 'upload-version':
          if( !isFeatureFlagEnabled(FF_ZIP_UPLOADS)){
            throw new Error('plugin upload command is disabled for now');
          }
          try {
              await pluginMachine.uploadVersion(
                  pluginMachineJson, options.version,pluginDir
              );
          } catch (error) {
              console.log(error);
          }
          break;
    case 'upload':
      const {fileName, filePath} = options;
      if( !fileName ) {
        throw new Error('No fileName found');
      }
      if( !filePath ) {
        throw new Error('No filePath found');
      }

      try {
          await pluginMachine.uploadFile(
              fileName, filePath
          );
      } catch (error) {
          console.log(error);
      }
      break;
    case 'build':
          const {buildPlugin,copyBuildFiles} = require('../lib/zip');
          //Build pluigin (run npm/composer, etc)
          await buildPlugin(pluginMachineJson,'prod',dockerApi)
            .catch(err => {console.log({err})})
            .then(async () => {
                //Copy build files to buildDir if --buildDir is set
                if( buildDir ){
                  copyBuildFiles(pluginMachineJson,buildDir,pluginDir);
                  exitSuccess({message: 'Plugin built and copied'});

                }else{
                  exitSuccess({message: 'Plugin built'});
                }
            });
    break;
    case 'zip':
          pluginMachineJson = validatePluginJson(pluginMachineJson);
          //Offer to upload the zip file, if enabled
          if( isFeatureFlagEnabled(FF_ZIP_UPLOADS)){
            options = await promptForZipOptions(options);
          }
          const {makeZip,zipDirectory} = require('../lib/zip');

          //If --buildDir arg passed, zip the build dir
          if( buildDir ){
            await zipDirectory(buildDir, pluginMachineJson.slug).then(
              () => exitSuccess({message: 'Plugin zip created'})
            ).catch(() => exitError());
          }

          //Else use pluginMachine.json to find files to zip
          await makeZip(pluginDir,pluginMachineJson)
            .catch(err => {console.log({err})})
            .then(async () => {
                exitSuccess({message: 'Plugin zipped'});
            });
          //Upload zip if enabled, and chosen
          if (isFeatureFlagEnabled(FF_ZIP_UPLOADS) && options.version) {
              try {
                  await pluginMachine.uploadVersion(
                      pluginMachineJson, options.version,pluginDir
                  );
              } catch (error) {
                  console.log(error);
              }
          }
    break;
    case 'add':
      pluginMachineJson = validatePluginJson(pluginMachineJson);
      const rules =  require( '../data/rules')
      const features = require( '../data/features');
      options = await promptForFeature(options,features.default);
      options = await promptForFeatureRules(options,rules.default);
      await handleAddFeature(
        pluginDir,pluginMachine,pluginMachineJson,options
      );
      break;
    default:
      throw new Error(`Command plugin ${options.command} not found`);
      break;
  }

}

const FS = require('q-io/fs');
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import mongoose from 'mongoose';
import _ from 'lodash';

/**
 * convert modelName parameter to a class definition
 * @param modelName
 * @returns User.model, Question.model, etc
 */
function getModel(modelName) {
  let model = require(`../app/models/${modelName}.model`);
  if (!model)
    throw new Error(`file ../app/models/${modelName}.model not found`);
  model = model.default; // import default equivalent
  if (!model)
    throw new Error(`file definition ../app/models/${modelName}.model not found`);
  return model;
}

async function saveRow(klass, data) {
  // find duplicate
  let cleanData = _.omit(data, _.keys(mapping));
  let existing = await klass.findOne(cleanData);

  if (!existing) {
    let findResult = {};
    let mappedData = _.pick(data, _.keys(mapping));
    let keys = _.keys(mappedData);
    let findErr = false;

    for (let k of keys) {
      let res = await mapping[k](data[k]);

      if (res) {
        //collect findResult
        findResult = Object.assign(findResult, res);
      }
      else {
        findErr = true;
        console.log(`mapping error: ${k} not found`, data[k]);
        break;
      }
    }

    if (!findErr) {
      // merge custom mapped field back to data
      let newData = Object.assign(cleanData, findResult);
      let row = new klass(newData);
      await row.save();
      console.log('saving row', data);
    }
  } else {
    console.log('duplicate row', data);
  }
}
async function parse_json(tableName, content) {
  // json content file has to be an array
  const fileContent = JSON.parse(content);
  let model = getModel(tableName);
  for (let row of fileContent) {
    try {
      await saveRow(model, row);
    } catch (err) {
      console.log('save exception ' + err.message, row);
    }

  }
}

async function readJson(t, filepath) {
  try {
    console.log('start file ', filepath);
    let content = await FS.read(filepath);
    await parse_json(t, content);
    console.log('file processing finished', filepath, '\n\n');
  } catch (err) {
    console.log('readJson error ' + err);
  }
}

function init() {
  validateEnvVariables();
  mongooseConf(mongoose);
}


/**
 * convert map-user to user.id
 */
let userMapper = async (data) => {
  let model = getModel('user');
  let user = await model.findOne(data);
  if (user)
    return {user: user._id};
  return null;
};

/**
 * convert map-local to local by hashing local.password
 */
let userLocalMapper = async (data) => {
  let ret = data;
  let model = getModel('user');

  ret.password = new model().generateHash(ret.password);
  return {local: ret};
};
/**
 * mapping dictionary that map a field in the dev-data jsons
 */
const mapping = {
  'map-user': userMapper,
  'map-local': userLocalMapper
};

/**
 * this is es7 code so has to be called by a shell that has babel-register,e.g populate-runner.js
 * @param tables are file name in dev-data folder that will be imported to the database
 * @returns {Promise.<void>}
 */
module.exports = async function start(tables) {

  init();
  //  await test() // when developing new mapping functor
  for (let t of tables) {
    await readJson(t, `./dev-data/${t}.json`);
  }
  console.log('after all processing');
  mongoose.connection.close();
};

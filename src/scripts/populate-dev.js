const FS = require("q-io/fs");
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import mongoose from 'mongoose';

function getKlass(tableName) {
    let klass = require(`../app/models/${tableName}.model`)
    if (!klass)
        throw new Error(`file ../app/models/${tableName}.model not found`)
    klass = klass.default // import default equivalent
    if (!klass)
        throw new Error(`file definition ../app/models/${tableName}.model not found`)
    return klass
}


async function parse_json(tableName, content) {
    const fileContent = JSON.parse(content);
    let klass = getKlass(tableName)
    try {
        for (let i = 0; i < fileContent.length; i++) {
            let row = new klass(fileContent[i])
            await row.save() // do it inside for loop so will stop at first error (duplicate data)
        }
    } catch (err) {
        console.log('saving err', err.message)
    }
}

async function readJson(t, filepath) {
    try {
        let content = await FS.read(filepath)
        await parse_json(t, content)
        console.log(t + ' processing finished')
    } catch (err) {
        console.log('readJson error ' + err)
    }
}

function init() {
    validateEnvVariables();
    mongooseConf(mongoose);
}


module.exports = async function start(tables) {

    init()

    let promises = tables.map(t => readJson(t, `./dev-data/${t}.json`))
    let results = await Promise.all(promises); // magic statement to wait on a loop

    console.log('after all processing')
    mongoose.connection.close();
}

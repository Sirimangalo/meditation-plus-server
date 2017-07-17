const FS = require("q-io/fs");
import User from '../app/models/user.model'
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import mongoose from 'mongoose';

function getKlass(tableName) {
    let klass = require(`../app/models/${tableName}.model`)
    if (!klass)
        throw new Error(`file ../app/models/${tableName}.model not found`)
    klass = klass.default // import default
    if (!klass)
        throw new Error(`file definition ../app/models/${tableName}.model not found`)

    return klass
}

async function saveRow(klass, data) {

    let row = new klass(data)
    console.log('saving')
    return await row.save()
//return 'ok'
}
async function parse_json(content) {
    const fileContent = JSON.parse(content);

    let tableName = 'user';
    let klass = getKlass(tableName)

    const data = fileContent[0];
    let saveResult = 0

    /*
     saveResult = fileContent.map(async(d)=> {
     return await saveRow(klass,d)
     })
*/
    // can't use .map for some reason with await
    for (let i = 0; i<fileContent.length;i++) {
        await saveRow(klass,fileContent[i])
    }
     // saveResult = await saveRow(klass, data)
    console.log('after saving')
    return saveResult // can not have await as last statment in a function
}

async function read_json(filepath) {
    //move try to main?
    try {
        let content = await FS.read(filepath)
        await parse_json(content)
    } catch (err) {
        console.log('error in handler ' + err)
    }
    finally {
        mongoose.connection.close();
        console.log('exit')
    }

}

function init() {
    validateEnvVariables();
    mongooseConf(mongoose);
}


module.exports = function start(tables) {

    init()
    tables.map(t => read_json(`./dev-data/${t}.json`))
}

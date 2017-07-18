const FS = require("q-io/fs");
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import mongoose from 'mongoose';
import _ from 'lodash';

function getKlass(tableName) {
    let klass = require(`../app/models/${tableName}.model`)
    if (!klass)
        throw new Error(`file ../app/models/${tableName}.model not found`)
    klass = klass.default // import default equivalent
    if (!klass)
        throw new Error(`file definition ../app/models/${tableName}.model not found`)
    return klass
}

async function saveRow(klass, data) {

    // find duplicate
    let clean_data = _.omit(data, _.keys(mapping))
    // console.log("clean_data",clean_data)
    let existing = await klass.findOne(clean_data)

    if (!existing) {

        let find_result = {}
        let mapped_data = _.pick(data, _.keys(mapping))
        let keys = _.keys(mapped_data)
        let find_err = false

        for (let k of keys) {
            let res = await mapping[k](data[k])

            if (res) {
                //collect find_result
                find_result = Object.assign(find_result, res)
            }
            else {
                find_err = true
                console.log(`mapping error: ${k} not found`, data[k])
                break
            }
        }

        if (!find_err) {
            // merge custom mapped field back to data
            let new_data = Object.assign(clean_data, find_result)
            let row = new klass(new_data)
            await row.save()
            console.log("saving row", data)
        }
    }
    else {
        console.log("duplicate row", data)
    }
}
async function parse_json(tableName, content) {
    // json content file has to be an array
    const fileContent = JSON.parse(content);
    let klass = getKlass(tableName)
    for (let row of fileContent) {
        try {
            await saveRow(klass, row)
        } catch (err) {
            console.log('save exception ' + err.message, row)
        }

    }
}

async function readJson(t, filepath) {
    try {
        console.log('start file ', filepath)
        let content = await FS.read(filepath)
        await parse_json(t, content)
        console.log('file processing finished', filepath, "\n\n")
    } catch (err) {
        console.log('readJson error ' + err)
    }
}

function init() {
    validateEnvVariables();
    mongooseConf(mongoose);
}


let user_id_functor = async (data) => {
    let klass = getKlass('user')
    let user = await klass.findOne(data)
    if (user)
        return {user: user._id}
    return null
}

let password_functor = async (data) => {
    let ret = data
    let klass = getKlass('user')

    ret.password = new klass().generateHash(ret.password)
    return {local:ret}
}
const mapping = {
    "user-id": user_id_functor,
    "user-local": password_functor
}


module.exports = async function start(tables) {

    init()
    //  await test() // when developing new mapping functor
    for (let t of tables) {
        await readJson(t, `./dev-data/${t}.json`)
    }
    /*
     let promises = tables.map(t => readJson(t, `./dev-data/${t}.json`))
     let results = await Promise.all(promises); // magic statement to wait on a loop
     */

    console.log('after all processing')
    mongoose.connection.close();
}

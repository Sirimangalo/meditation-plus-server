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
        let keys = _.keys(mapping)
        let find_err = false

        for (let i = 0; i < keys.length; i++) {
            let k = keys[i]
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
            console.log(new_data)
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
    const fileContent = JSON.parse(content);
    let klass = getKlass(tableName)
    for (let i = 0; i < fileContent.length; i++) {
        await saveRow(klass, fileContent[i])

        // let row = new klass(fileContent[i])
        // await row.save() // do it inside for loop so will stop at first error (duplicate data)
    }
}

async function readJson(t, filepath) {
    try {
        console.log('start file ', filepath)
        let content = await FS.read(filepath)
        await parse_json(t, content)
        console.log('file processing finished', filepath,"\n\n")
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

const mapping = {
    "user-id": user_id_functor
}

/**
 * not used normally, for testing new functor
 * @returns {Promise.<void>}
 */
async function test() {
    let data = {
        "weekDay": 2,
        "hour": 1155,
        "user-id": {"username": "kelly"}
    }

    // find duplicate
    let clean_data = _.omit(data, _.keys(mapping))
    let tableName = 'appointment'
    let klass = getKlass(tableName)
    console.log("clean_data", clean_data)
    let existing = await klass.findOne(clean_data)

    if (!existing) {

        let find_result = {}
        let keys = _.keys(mapping)
        let find_err = false

        for (let i = 0; i < keys.length; i++) {
            let k = keys[i]
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
            console.log(new_data)
            let row = new klass(new_data)
            await row.save()
            console.log("saving " + tableName + " row")
        }
    }
    else {
        console.log("duplicate " + tableName + " row")
    }
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

const FS = require("q-io/fs");
import User from '../app/models/user.model'
import mongooseConf from '../config/mongoose.conf.js';
import { validateEnvVariables } from '../config/env.conf.js';
import mongoose from 'mongoose';

async function saveRow(tableName,data) {
    let row = new User (data)
    console.log('saving row')
    return await row.save()
//return 'ok'
}
async function parse_json(content) {
    const fileContent = JSON.parse(content);
    const data = fileContent[0];
    console.log(data)

    let saveResult= await saveRow('user',data)
    console.log('save result',saveResult)
}

async function read_json(filepath) {
    //move try to main?
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

function init()
{
    validateEnvVariables();
    mongooseConf(mongoose);
}


module.exports = function start(tables) {

    init()
    tables.map(t=>read_json(`./dev-data/${t}.json')
}

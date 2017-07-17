let FS = require("q-io/fs");

function parse_json(content) {
    const file_content = JSON.parse(content);
    const example = file_content[0];
    console.log(example)

    console.log('exit')
}

function read_json(filepath) {
    //can await here
    FS.read(filepath).then(
        parse_json
    ).catch((err)=> {
        console.log('error in handler ' + err)
    })
}

module.exports = function start() {
    read_json('./dev-data/user.json')
}

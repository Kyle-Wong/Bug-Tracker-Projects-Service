const fs = require('fs');
const logName = 'log.txt';
fs.writeFile(logName,'',function(err) {if (err) throw err;});
exports.log = function(text){
    date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');     
    console.log(`[${date}] ${JSON.stringify(text)}`);
    fs.appendFile(logName,`[${date}] ${JSON.stringify(text)}\n`,function(err){if (err) throw err;});
};
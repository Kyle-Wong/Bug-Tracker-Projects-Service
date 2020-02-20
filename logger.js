const fs = require('fs');
const logName = 'log.txt';
fs.writeFile(logName,'',function(err) {if (err) throw err;});
exports.log = function(text){
    date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');    
    if(typeof text == "object"){
        console.log(text);
    } else{
        console.log(`[${date}] ${JSON.stringify(text)}`);
    }
    fs.appendFile(logName,`[${date}] ${JSON.stringify(text)}\n`,function(err){if (err) throw err;});
};
exports.sqlErr = function(err){
    date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    var text = {message:err.sqlMessage,errno:err.errno,sql:err.sql}    
    console.log(text);
    fs.appendFile(logName,`[${date}] ${JSON.stringify(text)}\n`,function(err){if (err) throw err;});
}
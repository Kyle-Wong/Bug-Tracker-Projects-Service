const errors = require('./errors');
const logger = require('./logger');
const pool = require('./database');
exports.createTag = async function(resBuilder, tagName){
    logger.log("Creating tag:" + tagName);
    var query = `INSERT INTO tags(tag_name) VALUES(?)`;
    try{
        const rows = await pool.query(query,[tagName]);
        return resBuilder.success().end();
    } catch(err){
        if(err.errno == 2627){
            //duplicate tag. Identical outcome to successful add
            logger.log("Duplicate Tag")
            return resBuilder.success().end();
        } else {
            //mysql error
            logger.sqlErr(err);
            return resBuilder.error(err).end();
        }

    }
}



exports.getAllTags = async function(resBuilder){
    try{
        const tags = await exports.tagList();
        resBuilder.json["Tags"] = tags;
        resBuilder.success().end();
    } catch(err){
        logger.sqlErr(err);
        resBuilder.error(err).end();
    }
    
}


exports.tagList = async function(){
    var query = `SELECT * FROM tags`;
    const rows = await pool.query(query)
    return rows;
}

exports.addTags = async function(tag_names){
    if(tag_names.length == 0)
        return;
    var query1 = `INSERT IGNORE INTO tags(tag_name) VALUES`
    var array1 = new Array(tag_names.length);
    array1.fill("(?)");
    query1 += array1.join(",") + ";";

    var query2 = `SELECT * FROM tags WHERE tag_name IN (`
    var array2 = new Array(tag_names.length);
    array2.fill("?");
    query2 += array2.join(",");
    query2 += ");"
    console.log(query1+query2);
    try{
        const rows = await pool.query(query1+query2,[...tag_names,...tag_names]);
        console.log(rows[1]);
        return rows[1];
    } catch (err){
        logger.sqlErr(err);
        return;
    }
}
exports.getTagIDs = async function(tag_names){
    if(tag_names.length == 0)
        return {};
    var query = `SELECT * FROM tags WHERE tag_name IN (`
    var array1 = new Array(tag_names.length);
    array1.fill("?");
    query += array1.join(",");
    query += ");"

    try{
        const rows = await pool.query(query,tag_names);
        console.log(rows);
        return rows;
    } catch(err){
        logger.sqlErr(err);
        return;
    }
}
exports.getTagNames = async function(tag_ids){
    if(tag_ids.length == 0)
        return {};
    var array1 = new Array(tag_ids.length).fill("?");
    var query = `SELECT * FROM tags WHERE tag_id IN (${array1.join(",")});`
    try{
        const rows = await pool.query(query,tag_names);
        console.log(rows);
        return rows;
    } catch(err){
        logger.sqlErr(err);
        return;
    }
}

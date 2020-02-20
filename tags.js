const errors = require('./errors');
const logger = require('./logger');

exports.createTag = async function(pool, resBuilder, tagName){
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



exports.getAllTags = async function(pool,resBuilder){
    try{
        const tags = await exports.tagList(pool);
        resBuilder.json["Tags"] = tags;
        resBuilder.success().end();
    } catch(err){
        logger.sqlErr(err);
        resBuilder.error(err).end();
    }
    
}


exports.tagList = async function(pool){
    var query = `SELECT * FROM tags`;
    const rows = await pool.query(query)
    return rows;
}
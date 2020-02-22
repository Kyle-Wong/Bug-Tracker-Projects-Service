const errors = require('./errors');
const logger = require('./logger');
const tags = require('./tags');
const moment = require('moment');
const pool = require("./database");

exports.addBug = async function(resBuilder, username, projectID,title, body, priority, tag_names){
    var query = `INSERT INTO bugs(project_id,title,body,create_time,resolved,priority,created_by)
                VALUES(?,?,?,?,?,?,?); SELECT LAST_INSERT_ID() as bug_id;`;
    try{
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        const rows = await pool.query(query,[projectID,title,body,now,0,priority,username]);
        console.log(rows);
        const bugID = rows[1][0].bug_id;
        //insert tags to DB+get tag ids
        const tagList = await tags.addTags(tag_names);
        exports.addTagsToBug(bugID,tagList);
        return resBuilder.default(0).end();
    } catch(err){
        logger.sqlErr(err);
        if(err.errno == 1452){
            logger.log("Project not found");
            return resBuilder.default(errors.PROJECT_NOT_FOUND).end();
        }
        return resBuilder.error(err).end();
    }
}


exports.addTagsToBug = async function(bugID,tagList){

    var array1 = new Array(tagList.length).fill("(?,?)");
    var query = `INSERT INTO bugtags(bug_id,tag_id) VALUES${array1.join(",")};`

    var itemArray = Array(tagList.length*2);
    for(var i = 0; i < itemArray.length; i++){
        if(i%2==0){
            itemArray[i]=bugID;
        } else {
            itemArray[i] = tagList[(i-1)/2].tag_id;
        }
    }
    try{
        const rows = await pool.query(query,itemArray);
    } catch(err){
        logger.sqlErr(err);
    }
}
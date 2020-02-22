const errors = require('./errors');
const logger = require('./logger');
const tags = require('./tags');
const moment = require('moment');
const pool = require("./database");

exports.addBug = async function(resBuilder, username, projectID,title, body, priority, tag_names){
    var query = `INSERT INTO bugs(project_id,title,body,create_time,resolved,is_deleted,priority,created_by)
                VALUES(?,?,?,?,?,?,?); SELECT LAST_INSERT_ID() as bug_id;`;
    try{
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        const rows = await pool.query(query,[projectID,title,body,now,0,0,priority,username]);
        console.log(rows);
        const bugID = rows[1][0].bug_id;
        //insert tags to DB+get tag ids
        const tagList = await tags.addTags(tag_names);
        exports.addTagsToBug(bugID,tagList);
        return resBuilder.success().end();
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
exports.updateTagsForBug = async function(bugID, tagList){
    //remove all tags, then add new list
    var array1 = new Array(tagList.length).fill("(?,?)");
    var query = `DELETE FROM bugtags WHERE bug_id=?;    
                INSERT INTO bugtags(bug_id,tag_id) VALUES${array1.join(",")};`
    var itemArray = Array(tagList.length*2);
    for(var i = 0; i < itemArray.length; i++){
        if(i%2==0){
            itemArray[i]=bugID;
        } else {
            itemArray[i] = tagList[(i-1)/2].tag_id;
        }
    }       
    try{
        const rows = await pool.query(query,[bugID,...tagList]);
    } catch(err){
        logger.sqlErr(err);
    }

}

exports.deleteBug = async function(resBuilder, bugID){
    logger.log(`Deleting bug ${bugID}`)
    var query = `UPDATE bugs SET is_deleted = 1 WHERE bug_id = ?;`;
    try{
        const rows = await pool.query(query,[bugID]);
        return resBuilder.success().end();
    } catch(err){
        logger.sqlErr(err);
        return resBuilder.error(err).end();
    }
}
exports.resolveBug = async function(resBuilder, bugID){
    logger.log(`Resolving bug ${bugID}`)
    var query = `UPDATE bugs SET resolved = 1 WHERE bug_id = ?;`;
    try{
        const rows = await pool.query(query,[bugID]);
        return resBuilder.success().end();
    } catch(err){
        logger.sqlErr(err);
        return resBuilder.error(err).end();
    }
}
exports.editBug = async function(resBuilder, bugID, title, body, priority, tag_names){
    var query = `UPDATE bugs SET title=?,body=?,priority=? WHERE bug_id=?`;
    try{
        const rows = pool.query(query,[title,body,priority,bugID]);
        logger.log(rows);

        //insert any new tags
        const tagList = await tags.addTags(tag_names);
        //remove and add tags to bug
        exports.updateTagsForBug(tagList);
        return resBuilder.success().end();

    } catch(err){
        logger.sqlErr(err);
        return resBuilder.error(err).end();
    }
}
exports.assignBugToUser = async function(resBuilder, username,bugID){
    var query = `INSERT INTO userbugs(username, bug_id) VALUES (?,?);`
    try{
        const rows = await pool.query(query,[username,bugID]);
        resBuilder.success().end();
    } catch(err){
        logger.sqlErr(err);
        if(err.errno == 1062){
            //user already assigned to bug
            resBuilder.default(errors.USER_ALREADY_ASSIGNED).end();
        }
        return resBuilder.error(err).end();
    }

}
exports.removeBugFromUser = async function(resBuilder, username,bugID){
    var query = `DELETE FROM userbugs WHERE username=? AND bug_id=?;`;
    try{
        const rows = await pool.query(query,[username,bugID]);
        resBuilder.success().end();
    } catch(err){
        logger.sqlErr(err);
        return resBuilder.error(err).end();
    }
}

exports.getBugList = async function(resBuilder){

}
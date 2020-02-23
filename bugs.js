const errors = require('./errors');
const logger = require('./logger');
const tags = require('./tags');
const moment = require('moment');
const pool = require("./database");

const bugsPerPage = 10;

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

exports.getBugList = async function(resBuilder, projectID, searchString, pageIndex,orderBy, orderDirection, includeResolved, tagsFilter){
    /*
        searchString:char string that returns matches in title and body
        pageIndex:page of results, beginning at 1. Each page is 10 results
        orderBy: order results by name, priority, create time
        includeResolved: include or exclude resolved bugs
        tagsFilter: array of string tags, filter out results that have zero of these tags.
    */
    var tagFilterString = "";
    var query = `SELECT bugs.bug_id,bugs.title, bugs.body, bugs.create_time, bugs.resolved, bugs.priority, bugs.created_by, GROUP_CONCAT(userbugs.username SEPARATOR ";;") as workers, tag_names`;
    query += `\nFROM bugs LEFT JOIN userbugs ON bugs.bug_id = userbugs.bug_id`;
    if(tagsFilter.length > 0){
        //looks like: ?,?,?
        var tempArray = new Array(tagsFilter.length);
        tempArray.fill("?");
        tagFilterString += tempArray.join(",");
        
        query += `,\n(SELECT bug_id, GROUP_CONCAT(tag_name SEPARATOR ";;") as tag_names
                        FROM bugtags bt, tags t
                        WHERE bt.tag_id = t.tag_id AND
                        bt.bug_id IN(
                                    SELECT bug_id
                                    FROM bugtags bt, tags t
                                    WHERE bt.tag_id = t.tag_id AND t.tag_name IN (${tagFilterString})
                                    GROUP BY bug_id)
                        GROUP BY bug_id) tag_filter`;
    } else {
        query += `,(SELECT b.bug_id, GROUP_CONCAT(tag_name SEPARATOR ";;") as tag_names
                    FROM bugs b LEFT JOIN bugtags bt ON b.bug_id = bt.bug_id
                    LEFT JOIN tags t ON t.tag_id = bt.tag_id
                    GROUP BY bug_id) tag_filter`;
    }
    query += "\nWHERE project_id = 18";
    query = (typeof searchString === 'undefined' || searchString == "") ? query : query + "\nAND (title LIKE ? OR body LIKE ?)";
    query = (includeResolved == "true") ? query : query + "\nAND bugs.resolved = 0";
    query += "\nAND bugs.bug_id = tag_filter.bug_id";
    query += "\nAND bugs.is_deleted = 0";
    query += "\nGROUP BY bugs.bug_id";
    query += "\nORDER BY ? ?";
    query += "\nLIMIT ?, ?"

    var itemArray = [];
    if(tagsFilter.length > 0){
        itemArray.push(...tagsFilter)
    }
    if(typeof searchString !== 'undefined' && searchString != "")
        itemArray.push(`%${searchString}%`,`%${searchString}%`);
    itemArray.push(orderBy,orderDirection,pageIndex*bugsPerPage,bugsPerPage);
    console.log(query);
    logger.log(itemArray);
    try{
        const rows = await pool.query(query,itemArray);
        var bugList = Array(rows.length);
        for(var i = 0; i < rows.length; i++){
            var workers = (rows[i].workers) ? rows[i].workers.split(";;") : [];
            var tag_names = (rows[i].tag_names) ? rows[i].tag_names.split(";;") : [];
            bugList[i] = {
                bug_id:rows[i].bug_id,
                title:rows[i].title,
                body:rows[i].body,
                create_time:rows[i].create_time,
                resolved:rows[i].resolved,
                created_by:rows[i].created_by,
                workers:workers,
                tag_names:tag_names,
            }
        }
        logger.log(bugList);
        resBuilder.json["bugs"] = bugList;
        return resBuilder.success().end();
    } catch(err){
        logger.sqlErr(err);
        return resBuilder.error(err).end();
    }


}
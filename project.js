const errors = require('./errors');
const logger = require('./logger');

accessLevel = {
    root:0,
    edit:1,
    view:2,
}



exports.createProject = async function(pool, resBuilder, rootUser, projectName){
    var errorCode = errors.validUsername(rootUser);
    if(errorCode != 0){
        resBuilder.default(errorCode).end();
    }
    errorCode = errors.validProjectName(projectName);
    if(errorCode != 0){
        resBuilder.default(errorCode).end();
    }

    var query = `INSERT INTO projects(root_user,project_name,is_deleted) VALUES (?,?,?); 
    SELECT LAST_INSERT_ID() as project_id;`;
    try{
        const rows = await pool.query(query,[rootUser,projectName,0]);
        const projectID = rows[1][0].project_id;
        changeProjectAccess(pool,rootUser,projectID,accessLevel.root);
        resBuilder.success().end();
    } catch(err){
        logger.sqlErr(err);
        if(err.errno == 1452){
            //user doesn't exist
            resBuilder.default(405).end();
        } else {
            resBuilder.error(err).end();
        }
    }
    

}
exports.allowProjectAccess = async function(pool, resBuilder, username, projectID, accessLevel){
    var errorCode = errors.validUsername(username);
    if(errorCode != 0){
        resBuilder.default(errorCode).end();
    }

    var success = changeProjectAccess(pool,username,projectID,accessLevel);
    if(success)
        resBuilder.success().end();
    else
        resBuilder.default(400).end();
}


exports.addUser = async function(pool, resBuilder, username, email, isActive, accountType){
    logger.log(`Registering ${username} to db`);
    var query = `INSERT INTO users VALUES(?,?,?,?)`
    try{
        await pool.query(query,[username,email,isActive,accountType]);
        return resBuilder.success().end();
    } catch(err){
        logger.log(err);
        return resBuilder.error(err).end();
    }
}

async function changeProjectAccess(pool, username, projectID, accessLevel){
    var query = `INSERT INTO project_access VALUES (?,?,?)
                ON DUPLICATE KEY UPDATE accessLevel=?`;
    try{
        await pool.query(query,[username,projectID,accessLevel,accessLevel]);
        return true;
    } catch(err){
        logger.log(err);
        return false;
    }
}
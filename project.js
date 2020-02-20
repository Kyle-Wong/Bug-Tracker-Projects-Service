const errors = require('./errors');
const logger = require('./logger');





exports.createProject = function(pool, resBuilder, rootUser, projectName){
    var errorCode = errors.validUsername(username);
    if(errorCode != 0){
        resBuilder.default(errorCode).end();
    }
    errorCode = errors.validProjectName(projectName);
    if(errorCode != 0){
        resBuilder.default(errorCode).end();
    }


}
exports.allowProjectAccess = function(pool, resBuilder, username, projectID, accessLevel){

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
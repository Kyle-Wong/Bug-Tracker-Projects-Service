const express = require('express')
const util = require('util');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const app = express();

const fs = require('fs');
const logger = require('./logger');
const ResponseBuilder = require('./response-builder');

const config = require('config');
const dbConfig = config.get('dbConfig');
logger.log(dbConfig);
const serverConfig = config.get('serverConfig');
logger.log(serverConfig);
var mysql = require("mysql");


app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

const project = require('./project');
const tags = require('./tags');
const bugs = require('./bugs');
const errors = require('./errors');



app.get('/', function(req, res){
    responseBuilder = new ResponseBuilder(res);
    
})

var server = app.listen(serverConfig.port, function(){
  var host = server.address().address;
  var port = server.address().port;
  logger.log(`Server listening at ${host}:${port}`);
})


app.post('/addUser', function(req,res){
  logger.log("Adding user");
  var body = req.body;
  logger.log(body);
  project.addUser(new ResponseBuilder(res),body.username,body.email,body.is_active,body.account_type);
});


//Project
app.post('/createProject', function(req,res){
  logger.log("Create Project")
  var body = req.body;
  var headers = req.headers;
  logger.log(req.body);
  project.createProject(new ResponseBuilder(res),headers.username,body.project_name);
});

app.post('/deleteProject', async function(req,res){
  logger.log("Deleting project");
  var body = req.body;
  var headers = req.headers;
  logger.log(req.body);
  const hasProjectAccess = await project.verifyAccessLevel(headers.username,body.project_id, project.accessLevel.root);
  if(hasProjectAccess)
    project.deleteProject(new ResponseBuilder(res),headers.username,body.project_name);
  else{
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.get('/getProjectList', async function(req,res){
  logger.log("Getting project list");
  var headers = req.headers;
  project.getProjectList(new ResponseBuilder(res),headers.username);
});

//Tags
app.get('/getAllTags', function(req,res){
  logger.log("Get all tags");
  tags.getAllTags(new ResponseBuilder(res));
});

app.post('/createTag', function(req,res){
  logger.log("Create tag");
  var body = req.body;
  logger.log(body);
  tags.createTag(new ResponseBuilder(res),body.tag_name);
});

app.post("/removeTag", async function(req,res){
  logger.log("Removing bugs");
  var body = req.body;
  logger.log(body);
  const hasProjectAccess = await project.verifyAccessLevel(headers.username,body.project_id, project.accessLevel.edit);
  if(hasProjectAccess)
    bugs.removeTagsFromBug(new ResponseBuilder(res),body.bug_id,body.tag_names);
  else{
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

//bugs
app.post('/addBug', async function(req,res){
  logger.log("Adding bug");

  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const hasProjectAccess = await project.verifyAccessLevel(headers.username,body.project_id, project.accessLevel.edit);
  if(hasProjectAccess){
    bugs.addBug(new ResponseBuilder(res),headers.username,body.project_id,body.title,body.body,body.priority,body.tags);
  }else{
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post('/deleteBug', async function(req, res){
  logger.log("Deleting bug");
  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const validAccessLevel = await project.verifyAccessLevel(headers.username,body.project_id,project.accessLevel.edit);
  if(validAccessLevel){
    bugs.deleteBug(new ResponseBuilder(res), body.bug_id);
  } else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post('/resolveBug', async function(req, res){
  logger.log("Resolving bug");
  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const validAccessLevel = await project.verifyAccessLevel(headers.username,body.project_id,project.accessLevel.edit);
  if(validAccessLevel){
    bugs.resolveBug(new ResponseBuilder(res),body.bug_id);
  } else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post('/assignBugToUser', async function(req,res){
  logger.log("assigning bug to user");
  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const validAccessLevel = await project.verifyAccessLevel(headers.username,body.project_id,project.accessLevel.edit);
  if(validAccessLevel){
    bugs.assignBugToUser(new ResponseBuilder(res),headers.username,body.bug_id);
  } else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post('/removeBugFromUser', async function(req, res){
  logger.log("Removing bug from user");
  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const validAccessLevel = await project.verifyAccessLevel(headers.username,body.project_id,project.accessLevel.edit);
  if(validAccessLevel){
    bugs.removeBugFromUser(new ResponseBuilder(res),body.bug_id);
  } else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post("/getBugList", async function(req, res){
  /*
    body: project_id, tags_filter
    query: search string, page num, result order, order direction, include resolved
  */
  logger.log("Getting list of bugs");
  var body = req.body;
  var headers = req.headers;
  var query = req.query;
  
  const page = parseInt(query.page);
  if(Number.isNaN(page)){
    page = 0;
  }
  if(!["title","create_time","priority"].includes(query.order.toLowerCase())){
    query.order = "title"
  }
  if(!["asc","desc"].includes(query.direction.toLowerCase())){
    query.direction = "desc"
  }
  if(!["true","false"].includes(query.includeResolved.toLowerCase())){
    query.includeResolved = "true";
  }
  logger.log(body);
  logger.log(query);
  bugs.getBugList(new ResponseBuilder(res),body.project_id,query.search,query.page,
    query.order,query.direction,query.includeResolved,body.tags_filter);

});

//invitations
app.get('/getInvitations', async function(req,res){
  logger.log("Getting invitation list");
  var headers = req.headers;
  project.getInvitationList(new ResponseBuilder(res),headers.username);
});

app.post('/inviteUser', async function(req,res){
  logger.log("Inviting user to project");
  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const validAccessLevel = await project.verifyAccessLevel(headers.username,body.project_id,project.accessLevel.root);
  const alreadyHasAccess = await project.verifyAccessLevel(body.invited,body.project_id,2);
  if(validAccessLevel){
    if(!alreadyHasAccess)
      project.inviteUser(new ResponseBuilder(res),body.invited,body.project_id,body.access_level);
    else{
      logger.log(`User(${body.invited}) already has access`);
      new ResponseBuilder(res).default(errors.USER_ALREADY_ACCESSED).end();

    }
  } else {
    //inviter isn't root user (can't invite) or invited already has access
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post('/resolveInvitation', async function(req,res){
  logger.log("Resolving invitation");
  var body = req.body;
  var headers = req.headers;
  var query = req.query;
  var accepted;
  if(query.accepted === 'true'){
    accepted = true;
  } else {
    accepted = false;
  }
  project.resolveInvitation(new ResponseBuilder(res),headers.username,body.project_id,accepted);
});
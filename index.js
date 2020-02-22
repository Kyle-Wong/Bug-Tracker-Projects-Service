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

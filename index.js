const express = require("express");
const util = require("util");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const app = express();

const fs = require("fs");
const logger = require("./logger");
const ResponseBuilder = require("./response-builder");

const config = require("config");
const dbConfig = config.get("dbConfig");
logger.log(dbConfig);
const serverConfig = config.get("serverConfig");
logger.log(serverConfig);
var mysql = require("mysql");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const project = require("./project");
const tags = require("./tags");
const bugs = require("./bugs");
const errors = require("./errors");

app.get("/", function(req, res) {
  responseBuilder = new ResponseBuilder(res);
});

var server = app.listen(serverConfig.port, function() {
  var host = server.address().address;
  var port = server.address().port;
  logger.log(`Server listening at ${host}:${port}`);
});

app.post("/prjt/user/add", function(req, res) {
  logger.log("Adding user");
  var body = req.body;
  logger.log(body);
  project.addUser(
    new ResponseBuilder(res),
    body.username,
    body.email,
    body.is_active,
    body.account_type
  );
});

//Project
app.post("/prjt/project/add", function(req, res) {
  logger.log("Create Project");
  var body = req.body;
  var headers = req.headers;
  logger.log(req.body);
  project.createProject(
    new ResponseBuilder(res),
    headers.username,
    body.project_name,
    body.body
  );
});

app.post("/prjt/project/delete", async function(req, res) {
  logger.log("Deleting project");
  var body = req.body;
  var headers = req.headers;
  logger.log(req.body);
  const hasProjectAccess = await project.verifyAccessLevel(
    headers.username,
    body.project_id,
    project.accessLevel.root
  );
  if (hasProjectAccess)
    project.deleteProject(
      new ResponseBuilder(res),
      headers.username,
      body.project_id
    );
  else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});
app.get("/prjt/project/get/:project_id", async function(req, res) {
  logger.log("Getting project");
  var headers = req.headers;
  var params = req.params;
  const hasProjectAccess = await project.verifyAccessLevel(
    headers.username,
    params.project_id,
    project.accessLevel.view
  );
  if (hasProjectAccess) {
    project.getProject(new ResponseBuilder(res), params.project_id);
  } else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});
app.get("/prjt/project/getAll", async function(req, res) {
  logger.log("Getting project list");
  var headers = req.headers;
  project.getDetailedProjectList(new ResponseBuilder(res), headers.username);
});

//Tags
app.get("/prjt/tag/getAll", function(req, res) {
  logger.log("Get all tags");
  tags.getAllTags(new ResponseBuilder(res));
});

app.post("/prjt/tag/add", function(req, res) {
  logger.log("Create tag");
  var body = req.body;
  logger.log(body);
  tags.createTag(new ResponseBuilder(res), body.tag_name);
});

app.post("/prjt/tag/remove", async function(req, res) {
  logger.log("Removing tags");
  var body = req.body;
  logger.log(body);
  const hasProjectAccess = await project.verifyAccessLevel(
    headers.username,
    body.project_id,
    project.accessLevel.edit
  );
  if (hasProjectAccess)
    bugs.removeTagsFromBug(
      new ResponseBuilder(res),
      body.bug_id,
      body.tag_names
    );
  else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

//bugs
app.post("/prjt/bug/add", async function(req, res) {
  logger.log("Adding bug");

  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const hasProjectAccess = await project.verifyAccessLevel(
    headers.username,
    body.project_id,
    project.accessLevel.edit
  );
  if (hasProjectAccess) {
    bugs.addBug(
      new ResponseBuilder(res),
      headers.username,
      body.project_id,
      body.title,
      body.body,
      body.priority,
      body.tags
    );
  } else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post("/prjt/bug/delete", async function(req, res) {
  logger.log("Deleting bug");
  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const validAccessLevel = await project.verifyAccessLevel(
    headers.username,
    body.project_id,
    project.accessLevel.edit
  );
  if (validAccessLevel) {
    bugs.deleteBug(new ResponseBuilder(res), body.bug_id);
  } else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post("/prjt/bug/resolve", async function(req, res) {
  logger.log("Resolving bug");
  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const validAccessLevel = await project.verifyAccessLevel(
    headers.username,
    body.project_id,
    project.accessLevel.edit
  );
  if (validAccessLevel) {
    bugs.resolveBug(new ResponseBuilder(res), body.bug_id);
  } else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post("/prjt/bug/assign", async function(req, res) {
  logger.log("assigning bug to user");
  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const validAccessLevel = await project.verifyAccessLevel(
    headers.username,
    body.project_id,
    project.accessLevel.edit
  );
  if (validAccessLevel) {
    bugs.assignBugToUser(
      new ResponseBuilder(res),
      headers.username,
      body.bug_id
    );
  } else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post("/prjt/bug/unassign", async function(req, res) {
  logger.log("Removing bug from user");
  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const validAccessLevel = await project.verifyAccessLevel(
    headers.username,
    body.project_id,
    project.accessLevel.edit
  );
  if (validAccessLevel) {
    bugs.removeBugFromUser(new ResponseBuilder(res), body.bug_id);
  } else {
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post("/prjt/bug/get", async function(req, res) {
  /*
    body: project_id, tags_filter
    query: search string, page num, result order, order direction, include resolved
  */
  logger.log("Getting list of bugs");
  var body = req.body;
  var headers = req.headers;
  var query = req.query;

  const page = parseInt(query.page);
  if (Number.isNaN(page)) {
    page = 0;
  }
  if (
    !["title", "create_time", "priority"].includes(query.order.toLowerCase())
  ) {
    query.order = "title";
  }
  if (!["asc", "desc"].includes(query.direction.toLowerCase())) {
    query.direction = "desc";
  }
  if (!["true", "false"].includes(query.includeResolved.toLowerCase())) {
    query.includeResolved = "true";
  }
  logger.log(body);
  logger.log(query);
  let { searchWords, tags } = bugs.splitSearchTerms(query.search);
  console.log(searchWords);
  console.log(tags);
  bugs.getBugList(
    new ResponseBuilder(res),
    body.project_id,
    searchWords,
    query.page,
    query.order,
    query.direction,
    query.includeResolved,
    tags
  );
});

//invitations
app.get("/prjt/invite/getAll", async function(req, res) {
  logger.log("Getting invitation list");
  var headers = req.headers;
  project.getInvitationList(new ResponseBuilder(res), headers.username);
});

app.post("/prjt/invite/send", async function(req, res) {
  logger.log("Inviting user to project");
  var body = req.body;
  var headers = req.headers;
  logger.log(body);
  const validAccessLevel = await project.verifyAccessLevel(
    headers.username,
    body.project_id,
    project.accessLevel.root
  );
  const alreadyHasAccess = await project.verifyAccessLevel(
    body.invited,
    body.project_id,
    2
  );
  if (validAccessLevel) {
    if (!alreadyHasAccess)
      project.inviteUser(
        new ResponseBuilder(res),
        body.invited,
        body.project_id,
        body.access_level
      );
    else {
      logger.log(`User(${body.invited}) already has access`);
      new ResponseBuilder(res).default(errors.USER_ALREADY_ACCESSED).end();
    }
  } else {
    //inviter isn't root user (can't invite) or invited already has access
    new ResponseBuilder(res).default(errors.INSUFFICIENT_ACCESS).end();
  }
});

app.post("/prjt/invite/resolve", async function(req, res) {
  logger.log("Resolving invitation");
  var body = req.body;
  var headers = req.headers;
  var query = req.query;
  var accepted;
  if (query.accepted === "true") {
    accepted = true;
  } else {
    accepted = false;
  }
  project.resolveInvitation(
    new ResponseBuilder(res),
    headers.username,
    body.project_id,
    accepted
  );
});

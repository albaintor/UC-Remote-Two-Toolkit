import express from "express";
let usersRouter = express.Router();

/* GET users listing. */
usersRouter.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = usersRouter;

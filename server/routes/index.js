import express from "express";
let indexRouter = express.Router();

/* GET home page. */
indexRouter.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = indexRouter;

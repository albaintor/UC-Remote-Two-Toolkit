import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import multer from 'multer';
import JSZip from 'jszip';
import got, {HTTPError, Options} from 'got'
import {rimraf} from 'rimraf';

import path from 'path';
// import indexRouter from './routes/index.js';
// import usersRouter from './routes/users.js';
import {RC2Model} from './RC2Model.js'
import fs from "node:fs";
import {elementAt} from "rxjs";
import {Remote} from "./remote.js";

const LISTEN_PORT = "8080";
const UPLOAD_DIR = './uploads';
var app = express();
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, UPLOAD_DIR);
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  }
});

const upload = multer({storage: storage})

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static('public'))

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

// module.exports = app;

const CONFIG_FOLDER = '.';
const WORKING_FOLDER = 'conf';
const TEMP_FOLDER = 'temp';
const CONFIG_FILE = 'config.json';
const REMOTE_USER = 'web-configurator';
let rc2Model = new RC2Model();

app.get('/server/api', (req, res, next) => {
  const url = req.headers.destinationurl;
  let headers = {}
  for (let key in req.headers) {
    headers[key] = req.headers[key];
  }
  headers['host'] = (new URL(url)).host;
  headers['User-Agent'] = '';
  const options = {
    headers: headers,
    searchParams: req.query,
  }

  console.log('Proxy get', url, req.query);
  got.get(url, options).then(proxyres => {
    let resBody;
    try {
      if (proxyres?.body) resBody = JSON.parse(proxyres.body);
    } catch (err) {
      console.error('Error parsing response', err, proxyres?.body);
    }
    res.status(200).json(resBody);
  }).catch(error => {

    // let request = {headers,
    //   searchParams: req.query
    // };

    errorHandler(error, req, res, next);
  })
})

app.delete('/server/api', (req, res, next) => {
  const url = req.headers.destinationurl;
  let headers = {}
  for (let key in req.headers) {
    headers[key] = req.headers[key];
  }
  headers['host'] = (new URL(url)).host;
  headers['User-Agent'] = '';
  const options = {
    headers: headers,
    searchParams: req.query,
  }
  console.log('Proxy delete', url, req.query);
  got.delete(url, options).then(proxyres => {
    let resBody;
    try {
      if (proxyres?.body) resBody = JSON.parse(proxyres.body);
    } catch (err) {
      console.error('Error parsing response', err, proxyres?.body);
    }
    res.status(200).json(resBody);
  }).catch(error => {
    //res.status(500).send(error).end();
    errorHandler(error, req, res, next);
  })
})

app.post('/server/api', (req, res, next) => {
  const url = req.headers.destinationurl;
  let headers = {}
  for (let key in req.headers) {
    headers[key] = req.headers[key];
  }
  headers['host'] = (new URL(url)).host;
  headers['User-Agent'] = '';
  const options = {
    headers: headers,
    searchParams: req.query,
    json: req.body
  }

  console.log('Proxy post', url, req.query, req.body, req.headers);
  got.post(url, options).then(proxyres => {
    let resBody;
    try {
      if (proxyres?.body) resBody = JSON.parse(proxyres.body);
    } catch (err) {
      console.error('Error parsing response', err, proxyres?.body);
    }
    res.status(200).json(resBody);
  }).catch(error => {
    errorHandler(error, req, res, next);
  })
})

app.put('/server/api', (req, res, next) => {
  const url = req.headers.destinationurl;
  let headers = {}
  for (let key in req.headers) {
    headers[key] = req.headers[key];
  }
  headers['host'] = (new URL(url)).host;
  headers['User-Agent'] = '';
  const options = {
    headers: headers,
    searchParams: req.query,
    json: req.body
  }

  console.log('Proxy put', url, req.query);
  got.put(url, options).then(proxyres => {
    let resBody;
    try {
      if (proxyres?.body) resBody = JSON.parse(proxyres.body);
    } catch (err) {
      console.error('Error parsing response', err, proxyres?.body);
    }
    res.status(200).json(resBody);
  }).catch(error => {
    console.log('Erreur serveur', error.response);
    //res.status(500).send(error).end();
    errorHandler(error, req, res, next);
  })
})

app.get('/api/config', (req, res, next) => {
  try {
    const filepath = path.join(CONFIG_FOLDER, CONFIG_FILE);
    res.status(200).json(getConfigFile());
  } catch(error) {
    next(error);
  }
})

app.post('/api/config', (req, res, next) => {
  try {
    writeConfigFile(req.body)
    res.status(200).json(CONFIG_FILE);
  } catch(error) {
    next(error);
  }
})

app.post('/api/config/remote', async (req, res, next) => {
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;

  const remote = new Remote(req.body?.address, req.body?.port, user, req.body?.user, req.body?.token);
  try {
    await remote.register(req.body?.api_key_name);
    await remote.getRemoteName();
    const configFile = getConfigFile();
    if (!configFile.remotes)
      configFile.remotes = []
    configFile.remotes = configFile.remotes.filter(local_remote => !(remote.address === local_remote.address
      && remote.remote_name === local_remote.remote_name));
    configFile.remotes.push(remote.toJson());
    writeConfigFile(configFile);
    res.status(200).json(remote.toJson());
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.post('/upload',upload.single('file'),(req,res)=>{
  console.log(req.file, req.body.name);
  res.status(200).json(req.file.filename)
})

app.get('/download/:url', (req, res, next) => {
  try {
    const url = req.params.url;
    const filepath = path.join(UPLOAD_DIR, url);
    console.log('Download backup', filepath);
    res.download(filepath, url, (err) => {
      if (err) {
        res.send({
          error : err,
          msg   : `Error downloading the file ${filepath}`
        })
      }
    })
  } catch(error) {
    next(error);
  }
})


app.post('/api/load/path/:path', (req, res, next) => {
  try {
    const zipFile = req.params.path;
    rimraf(TEMP_FOLDER).then((value) => {
      console.log(`Decompress ${path.join(UPLOAD_DIR, zipFile)} to ${TEMP_FOLDER}`);

      fs.readFile(path.join(UPLOAD_DIR, zipFile), (err, data) => {
        if (err) return;
        let zip = new JSZip();
        zip.loadAsync(data).then( contents => {
          Object.keys(contents.files).forEach(filename => {
            if (filename.endsWith('/')) {
              try {
                fs.mkdirSync(path.join(TEMP_FOLDER, filename), {recursive: true});
              } catch (error) {
                console.error(`Error while creating temp directory ${filename}`, error);
              }
              return;
            }
            try {
              zip.file(filename).async('nodebuffer').then(content => {
                if (filename.includes(':'))
                {
                  console.log(`${zipFile} : renaming file ${filename} to ${filename.replaceAll(":", "_")}`);
                  filename = filename.replaceAll(':', '_');
                }
                const dest = path.join(TEMP_FOLDER, filename);
                try {
                  fs.writeFileSync(dest, content);
                } catch (error) {
                  console.error(`Error while creating file ${filename} to ${dest}`, error);
                }
              });
            } catch (error) {
              console.error(`Error while reading zip file ${filename}`, error);
            }

          });
      }).finally( () => {
          rimraf(WORKING_FOLDER).then((value2) => {
            fs.renameSync(TEMP_FOLDER, WORKING_FOLDER);
            const context = { "source": zipFile, "date": new Date().toISOString()};
            fs.writeFileSync(path.join(WORKING_FOLDER, 'context.json'), JSON.stringify(context));
            rc2Model.loadFromPath(WORKING_FOLDER);
            res.json({"filename": zipFile});
            // res.sendStatus(200).end();
          });
        });
      })
    });
  } catch (exception) {
      next(error);
      console.log(error);
  }
})

app.get('/api/context', (req, res, next) => {
  try {
    const contextFile = path.join(WORKING_FOLDER, 'context.json');
    if (fs.existsSync(contextFile))
    {
      const config_file = fs.readFileSync(contextFile, 'utf-8');
      const config_data = JSON.parse(config_file);
      res.json(config_data);
    }
    else
      res.status(404).send(contextFile).end();
  } catch(error) {
    next(error);
  }
})

app.get('/api/orphans', (req, res, next) => {
  try {
    res.send(rc2Model.getOrphans()).end();
  } catch(error) {
    next(error);
  }
})

app.get('/api/entities/usage', (req, res, next) => {
  try {
    res.send(rc2Model.entities_usage).end();
  } catch(error) {
    next(error);
  }
})

app.get('/api/entities', (req, res, next) => {
  try {
    res.send(rc2Model.entities_catalog).end();
  } catch(error) {
    next(error);
  }
})

app.get('/api/entity/:entity', (req, res, next) => {
  try {
    res.send(rc2Model.getEntity(req.params.entity)).end();
  } catch(error) {
    next(error);
  }
})

app.get('/api/activities_entities', (req, res, next) => {
  try {
    res.send(rc2Model.activities_entities).end();
  } catch(error) {
    next(error);
  }
})

app.get('/api/activities', (req, res, next) => {
  try {
    res.send(rc2Model.activities).end();
  } catch(error) {
    next(error);
  }
})

app.get('/api/profiles', (req, res, next) => {
  try {
    res.send(rc2Model.profiles).end();
  } catch(error) {
    next(error);
  }
})

app.get('/api/uploaded_files', (req, res, next) => {
  try {
    const files = [];
    fs.readdirSync(UPLOAD_DIR).map(fileName => {
      files.push(fileName);
    });
    res.send(files).end();
  } catch(error) {
    next(error);
  }
})

app.delete('/api/uploaded_files/:filename', (req, res, next) => {
  const filename = req.params.filename;
  if (fs.existsSync(path.join(UPLOAD_DIR, filename)))
  {
    try {
      fs.rmSync(path.join(UPLOAD_DIR, filename))
      res.status(200).json(filename)
    } catch (error)
    {
      next(error);
    }
  }
  else
  {
    res.status(404).send(filename).end();
  }
})
if (fs.existsSync(WORKING_FOLDER))
  rc2Model.loadFromPath(WORKING_FOLDER);
// console.dir(rc2Model.entities_catalog, {depth: null, colors: true});
app.listen(LISTEN_PORT, function () {
  console.log(`Listening on port ${LISTEN_PORT}!`);
});

function writeConfigFile(config)
{
  const filepath = path.join(CONFIG_FOLDER, CONFIG_FILE);
  console.log('Write config', filepath, config);
  fs.writeFileSync(filepath, config);
}

function getConfigFile() {
  const filepath = path.join(CONFIG_FOLDER, CONFIG_FILE);
  console.log('Read config', filepath);
  if (!fs.existsSync(filepath)) {
    return {};
  }
  const config_file = fs.readFileSync(filepath, 'utf-8');
  if (!config_file) return {};
  return JSON.parse(config_file);
}

function errorHandler(error, req, res, next) {
  if (error.response instanceof TypeError) {
    return res.status(400).json(error.name + ": " + error.message);
  }
  if (error.response)
  {
    let message = {};
    message['headers'] = error.response.headers;
    message['statusCode'] = error.response.statusCode;
    message['code'] = error.response.code;
    message['body'] = error.response.body;
    message['error'] = error.response.error;
    message['message'] = error.response.message;
    console.log('Erreur serveur réponse', message);
    if (error.response.body)
    {
      // const httpError = createHttpError(500, error, {
      //   headers: {
      //     "X-Custom-Header": "Value",
      //   }
      // });
      // return res.status(error.response.statusCode).send(error.response.body);
      // next(error);
      const httpError = createHttpError(error.response.statusCode, error.response.body, {headers: error.headers});
      return next(httpError);
      // return res.writeHead(error.response.statusCode, error.response.message).end(error);
      // return res.send(httpError)
      // return res.status(error.response.statusCode).send({
      //   error: true,
      //   message: error
      // })
      // return res.send(error);
      // return res.status(error.response.statusCode).json(error)
    }
    else
      return res.status(error.response.statusCode).json(message);
  }
  else
    console.log('Erreur serveur', error);
  return res.status(500).send(error);
}

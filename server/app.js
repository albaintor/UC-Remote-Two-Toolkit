import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import multer from 'multer';
import JSZip from 'jszip';
import got from 'got'
import {rimraf} from 'rimraf';

import path from 'path';
// import indexRouter from './routes/index.js';
// import usersRouter from './routes/users.js';
import {RC2Model} from './RC2Model.js'
import fs from "node:fs";
import {Remote} from "./remote.js";
import {getConfigFile, writeConfigFile} from "./config.js";
import {program} from 'commander';
import cors from 'cors';
import process from 'process';
// TODO Crash on windows, to be investigated
/*import { fileURLToPath } from 'url';
import open from 'open';
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  try {
    process.chdir(__dirname);
  }
  catch (err) {
  }
} catch (err2) {}*/


let LISTEN_PORT = "8000";
const UPLOAD_DIR = './uploads';
const RESOURCES_DIR = './resources';



var app = express();
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, UPLOAD_DIR);
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  }
});

fs.mkdirSync(UPLOAD_DIR, {recursive: true});

program
  .usage('[OPTIONS]...')
  // .option('-f, --flag', 'Detects if the flag is present.')
  .option('-p, --port <value>', 'Listen on given port', '8000')
  .parse(process.argv);
const options = program.opts();
if (options.port)
{
  LISTEN_PORT = options.port;
}

const upload = multer({storage: storage})

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use('/', express.static('public/browser'))
app.use('/home', express.static('public/browser'))

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

// module.exports = app;


const WORKING_FOLDER = 'conf';
const TEMP_FOLDER = 'temp';

const REMOTE_USER = 'web-configurator';
let rc2Model = new RC2Model();

app.get('/server/api', (req, res, next) => {
  let url = req.headers.destinationurl;
  let headers = {}
  for (let key in req.headers) {
    headers[key] = req.headers[key];
  }
  if (!url.startsWith('http://')) url = 'http://'+url;
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
  let url = req.headers.destinationurl;
  let headers = {}
  for (let key in req.headers) {
    headers[key] = req.headers[key];
  }
  if (!url.startsWith('http://')) url = 'http://'+url;
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
  let url = req.headers.destinationurl;
  let headers = {}
  for (let key in req.headers) {
    headers[key] = req.headers[key];
  }
  if (!url.startsWith('http://')) url = 'http://'+url;
  headers['host'] = (new URL(url)).host;
  headers['User-Agent'] = '';
  const options = {
    headers: headers,
    searchParams: req.query,
    json: req.body
  }
  if (!url.startsWith('http://')) url = 'http://'+url;
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

app.patch('/server/api', (req, res, next) => {
  let url = req.headers.destinationurl;
  let headers = {}
  for (let key in req.headers) {
    headers[key] = req.headers[key];
    console.log(key, req.headers[key]);
  }
  if (!url.startsWith('http://')) url = 'http://'+url;
  console.log("Destination url", url);
  headers['host'] = (new URL(url)).host;
  headers['User-Agent'] = '';
  const options = {
    headers: headers,
    searchParams: req.query,
    json: req.body
  }

  console.log('Proxy patch', url, req.query, req.body, req.headers);
  got.patch(url, options).then(proxyres => {
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
  let url = req.headers.destinationurl;
  let headers = {}
  for (let key in req.headers) {
    headers[key] = req.headers[key];
  }
  if (!url.startsWith('http://')) url = 'http://'+url;
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
    console.log("Get config");
    res.status(200).json(getConfigFile());
  } catch(error) {
    next(error);
  }
})

app.post('/api/config', (req, res, next) => {
  try {
    writeConfigFile(req.body)
    res.status(200).end();
  } catch(error) {
    next(error);
  }
})

app.post('/api/config/remote', async (req, res, next) => {
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;

  const remote = new Remote(req.body?.address, req.body?.port, user,req.body?.token);
  try {
    const api_key_name = req.body?.api_key_name ? req.body?.api_key_name : "RC2Tool";
    await remote.unregister(api_key_name);
    await remote.register(api_key_name);
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

app.get('/api/config/remote/:address', async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;

  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    const results = await remote.getRegisteredKeys();
    res.status(200).json(results);
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.delete('/api/config/remote/:address', async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    await remote.unregister(remoteEntry.api_key_name);
    res.status(200).json(address);
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
  finally {
    configFile.remotes = configFile.remotes.filter(local_remote => remote.address !== local_remote.address);
    writeConfigFile(configFile);
  }
})

app.post('/api/remote/:address/system', async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  let power = req.query.cmd;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.powerRemote(power));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/version', async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getVersion());
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/entities', async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getEntities());
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/activities', async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getActivities());
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/activities/:activity_id', async (req, res, next) => {
  const address = req.params.address;
  const activity_id = req.params.activity_id;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    console.error("Unknown remote", address);
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    const results = await remote.getActivity(activity_id);
    // console.log(results);
    res.status(200).json(results);
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.delete('/api/remote/:address/activities/:activity_id', async (req, res, next) => {
  const address = req.params.address;
  const activity_id = req.params.activity_id;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    console.error("Unknown remote", address);
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    const results = await remote.deleteActivity(activity_id);
    // console.log(results);
    res.status(200).json(results);
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.delete('/api/remote/:address/activities/:activity_id/ui/pages/:page_id', async (req, res, next) => {
  const address = req.params.address;
  const activity_id = req.params.activity_id;
  const page_id = req.params.page_id;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    console.error("Unknown remote", address);
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    const results = await remote.deleteActivityPage(activity_id, page_id);
    // console.log(results);
    res.status(200).json(results);
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})


app.get('/api/remote/:address/entities/:entity_id', async (req, res, next) => {
  const address = req.params.address;
  const entity_id = req.params.entity_id;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getEntity(entity_id));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.delete('/api/remote/:address/entities/:entity_id', async (req, res, next) => {
  const address = req.params.address;
  const entity_id = req.params.entity_id;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    console.error("Unknown remote", address);
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    const results = await remote.deleteEntity(entity_id);
    // console.log(results);
    res.status(200).json(results);
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/resources/:type', async (req, res, next) => {
  const address = req.params.address;
  const type = req.params.type;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.loadResources(type, RESOURCES_DIR));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/resources/:type/:id', async (req, res, next) => {
  const address = req.params.address;
  const type = req.params.type;
  const resource_id = req.params.id;
  try {
    res.set({'Content-Type': 'image/'+path.extname(resource_id).replace('.', '')});
    console.log('Get file', path.join(RESOURCES_DIR, address, type, resource_id))
    await res.sendFile(path.join(RESOURCES_DIR, address, type, resource_id), { root: '.' });
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/local/resources/:type', async (req, res, next) => {
  const address = req.params.address;
  const type = req.params.type;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getResources(type, RESOURCES_DIR));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/profiles', async (req, res, next) => {
  const address = req.params.address;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getProfiles());
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/profiles/:profileid/pages', async (req, res, next) => {
  const address = req.params.address;
  const profileId = req.params.profileid;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getProfilePages(profileId));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/profiles/:profileid/groups', async (req, res, next) => {
  const address = req.params.address;
  const profileId = req.params.profileid;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getProfileGroups(profileId));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/system/backup/export', async (req, res, next) => {
  const address = req.params.address;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getBackup(res));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})


app.get('/api/remote/:address/cfg/entity/commands', async (req, res, next) => {
  const address = req.params.address;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getConfigEntityCommands());
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})


app.get('/api/remote/:address/macros', async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getMacros());
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/macros/:macroid', async (req, res, next) => {
  const address = req.params.address;
  const macroid = req.params.macroid;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getMacro(macroid));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/intg/drivers', async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getDrivers());
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/intg/instances', async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getIntegrations());
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.get('/api/remote/:address/intg/instances/:intgid/entities', async (req, res, next) => {
  const address = req.params.address;
  const intgId = req.params.intgid;
  let filter = req.query.filter;
  if (filter === undefined) filter = "NEW";
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getIntegrationEntities(intgId, filter));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.post('/api/remote/:address/intg/install', upload.single('file'),async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  console.log("Upload integration", req.file);
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.uploadIntegration(req.file));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
  try {
    fs.rmSync(req.file.path)
  } catch (error)
  {
    console.error("Error while deleting uploaded integration", req.file, error);
  }
})

app.delete('/api/remote/:address/intg/drivers/:driverid', async (req, res, next) => {
  const address = req.params.address;
  const driverId = req.params.driverid;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.deleteDriver(driverId));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})

app.delete('/api/remote/:address/intg/instances/:integrationid', async (req, res, next) => {
  const address = req.params.address;
  const integrationId = req.params.integrationid;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.deleteIntegration(integrationId));
  } catch (error)
  {
    errorHandler(error, req, res, next);
  }
})


app.get('/api/remote/:address/pub/status', async (req, res, next) => {
  const address = req.params.address;
  let user = REMOTE_USER
  if (req.body?.user)
    user = req.body?.user;
  const configFile = getConfigFile();
  const remoteEntry = configFile?.remotes?.find(remote => remote.address === address);
  if (!remoteEntry)
  {
    res.status(404).json(address);
    return;
  }
  const remote = new Remote(remoteEntry.address, remoteEntry.port, remoteEntry.user, remoteEntry.token, remoteEntry.api_key);
  try {
    res.status(200).json(await remote.getStatus());
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

app.get('/api/entities', (req, res, next) => {
  try {
    res.send(Array.from(rc2Model.entities_catalog.values())).end();
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

app.get('/api/activities', (req, res, next) => {
  try {
    res.send(Array.from(rc2Model.activities.values())).end();
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
  open(`http://localhost:${LISTEN_PORT}`);
});


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
      return res.status(error.response.statusCode).json(message);
      // const httpError = createHttpError(error.response.statusCode, error.response.body, {headers: error.headers});
      // return next(httpError);
    }
    else
      return res.status(error.response.statusCode).json(message);
  }
  else
    console.log('Erreur serveur', error);
  return res.status(500).send(error);
}

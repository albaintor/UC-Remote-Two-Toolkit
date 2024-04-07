import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import multer from 'multer';
import JSZip from 'jszip';
import JSZipUtils from 'jszip-utils';
import {rimraf} from 'rimraf';

import path from 'path';
// import indexRouter from './routes/index.js';
// import usersRouter from './routes/users.js';
import {RC2Model} from './RC2Model.js'
import fs from "node:fs";

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

const WORKING_FOLDER = 'conf';
const TEMP_FOLDER = 'temp';
let rc2Model = new RC2Model();

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

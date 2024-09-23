import got, {HTTPError, Options} from 'got'
import fs from "node:fs";
import { readdir } from 'node:fs/promises';
import path from "path";
import {pipeline as streamPipeline} from 'node:stream/promises';
import * as url from "node:url";
import * as stream from "node:stream";

const SystemCommand = {
  STANDBY: 'STANDBY',
  REBOOT: 'REBOOT',
  POWER_OFF: 'POWER_OFF',
  RESTART: 'RESTART',
  RESTART_UI: 'RESTART_UI',
  RESTART_CORE: 'RESTART_CORE',
};

export class Remote
{
  address;
  port;
  api_key;
  api_key_name;
  user;
  token;
  valid_to;
  remote_name;
  protocol = 'http://';
  resources_path = '';


  constructor(address, port, user, token, api_key) {
    this.address = address;
    this.port = port;
    this.api_key = api_key;
    this.user = user;
    this.token = token;
  }

  async getResources(type, resources_directory) {
    this.resources_directory = path.join(resources_directory, this.address);
    const target_path = path.join(this.resources_directory, type);
    if (!fs.existsSync(target_path))
      return [];
    return await readdir(target_path);
  }

  async loadResources(type, resources_directory)
  {
    this.resources_directory = path.join(resources_directory, this.address);
    const target_path = path.join(this.resources_directory, type);
    if (fs.existsSync(target_path)) {
      fs.rmdirSync(target_path, { recursive: true });
    }
    if (!fs.existsSync(target_path)) {
      fs.mkdirSync(target_path, { recursive: true });
    }
    const limit = 100;
    const options = {
      ...this.getOptions(),
      searchParams: {
        limit,
        page: 1
      }
    }
    const global_list = [];
    const url = this.getURL() + `/api/resources/${type}`;
    let res = await got.get(url, options);
    const count = res.headers['pagination-count'];
    let icons = JSON.parse(res.body);
    for (let icon of icons) {
      global_list.push(icon['id']);
      await streamPipeline(got.stream(`${url}/${icon['id']}`, options),
        fs.createWriteStream(path.join(target_path, icon['id'])));
    }
    for (let i=2; i<=Math.ceil(count/limit); i++) {
      options.searchParams.page = i;
      res = await got.get(url, options);
      icons = JSON.parse(res.body);
      for (let icon of icons)
        global_list.push(icon['id']);{
        await streamPipeline(got.stream(`${url}/${icon['id']}`, options),
          fs.createWriteStream(path.join(target_path, icon['id'])));
      }
    }
    console.log('List of resources extracted', global_list);
    return global_list;
  }

  toJson()
  {
    const data = {address: this.address, port: this.port}
    if (this.remote_name) data.remote_name = this.remote_name;
    if (this.user) data.user = this.user;
    if (this.token) data.token = this.token;
    if (this.api_key) data.api_key = this.api_key;
    if (this.api_key_name) data.api_key_name = this.api_key_name;
    if (this.valid_to) data.valid_to = this.valid_to;
    return data;
  }

  getURL()
  {
    return this.protocol + this.address + ':' + this.port;
  }

  getOptions()
  {
    return {
      headers: this.getHeaders(),
      timeout: {
        lookup: 100,
        connect: 1000,
        secureConnect: 1000,
        socket: 1000,
        send: 10000,
        response: 3000
      }
    }
  }

  getHeaders()
  {
    let auth = 'Basic ' + Buffer.from(this.user + ':' + this.token).toString('base64')
    if (this.api_key)
      auth = 'Bearer '+this.api_key;
    return {
      'host': this.address,
      'Accept': 'application/json;charset=utf-8',
      'User-Agent' : '',
      'Authorization': auth
    }
  }

  async getRemoteName()
  {
    const options = this.getOptions();
    const url = this.getURL() + '/api/pub/version';
    console.log('Get remote info', url, options);
    const res = await got.get(url, options);
    let resBody;
    try {
      if (res?.body) resBody = JSON.parse(res.body);
      console.log('Get remote info :', resBody);
      this.remote_name = resBody.device_name;
      return resBody.device_name;
    } catch (err) {
      console.error('Error', err, res?.body);
      throw(err);
    }
  }


  async getVersion()
  {
    const options = this.getOptions();
    const url = this.getURL() + '/api/pub/version';
    console.log('Get remote info', url, options);
    const res = await got.get(url, options);
    let resBody;
    try {
      if (res?.body) resBody = JSON.parse(res.body);
      return resBody;
    } catch (err) {
      console.error('Error', err, res?.body);
      throw(err);
    }
  }

  async getRegisteredKeys()
  {
    const options = this.getOptions();
    const url = this.getURL() + '/api/auth/api_keys';
    console.log('Get remote registering information', url, options);
    const res = await got.get(url, options);
    let resBody;
    try {
      if (res?.body) resBody = JSON.parse(res.body);
      return resBody;
    } catch (err) {
      console.error('Error retrieving remote keys', err, res?.body);
      throw(err);
    }
  }

  async register(api_key_name)
  {
    let headers = this.getHeaders();
    const options = {
      ...this.getOptions(),
      json: {
        name: api_key_name,
        scopes: ["admin"]
      }
    }
    const url = this.getURL() + '/api/auth/api_keys';
    console.log('Register remote', url, options);
    const res = await got.post(url, options);
    let resBody;
    try {
      if (res?.body) resBody = JSON.parse(res.body);
      this.api_key_name = api_key_name;
      this.api_key = resBody.api_key;
      this.valid_to = resBody.valid_to;
      return {api_key: this.api_key, api_key_name: this.api_key_name,
        valid_to: this.valid_to}
    } catch (err) {
      console.error('Error registering remote', err, res?.body);
      throw(err);
    }
  }

  async unregister(api_key_name)
  {
    const options = this.getOptions();
    let url = this.getURL() + '/api/auth/api_keys';
    const res = await got.get(url, options);
    const keys = JSON.parse(res.body);
    console.log("List of registered keys", keys);
    for (let key of keys) {
      if (key.name === api_key_name) {
        url = this.getURL() + '/api/auth/api_keys/' + key.key_id;
        console.log('Unregister remote', url, options);
        const res = await got.delete(url, options);
        let resBody;
        try {
          if (res?.body) resBody = JSON.parse(res.body);
          return resBody;
        } catch (err) {
          console.error('Error unregistering remote', err, res?.body);
          throw (err);
        }
      }
    }
  }

  async getEntity(entityId)
  {
    let headers = this.getHeaders();
    const limit = 100;
    const options = {
      ...this.getOptions(),
      searchParams: {
        limit,
        page: 1
      }
    }
    const url = this.getURL() + `/api/entities/${entityId}`;
    const res = await got.get(url, options);
    let resBody;
    try {
      if (res?.body) resBody = JSON.parse(res.body);
      return resBody;
    } catch (err) {
      console.error('Error', err, res?.body);
      throw(err);
    }
  }

  async getEntities()
  {
    let headers = this.getHeaders();
    const limit = 100;
    const options = {
      ...this.getOptions(),
      searchParams: {
        limit,
        page: 1
      }
    }
    const url = this.getURL() + '/api/entities';
    let res = await got.head(url, options);
    const count = res.headers['pagination-count']
    let entities = [];
    for (let i=1; i<=Math.ceil(count/limit); i++)
    {
      options.searchParams.page = i;
      res = await got.get(url, options);
      entities.push(...JSON.parse(res.body));
    }
    return entities;
  }

  async getActivities()
  {
    const limit = 100;
    const options = {
      ...this.getOptions(),
      searchParams: {
        limit,
        page: 1
      }
    }
    const url = this.getURL() + '/api/activities';
    let res = await got.head(url, options);
    const count = res.headers['pagination-count']
    let entities = [];
    for (let i=1; i<=Math.ceil(count/limit); i++)
    {
      options.searchParams.page = i;
      res = await got.get(url, options);
      entities.push(...JSON.parse(res.body));
    }
    return entities;
  }

  async getActivity(activity_id)
  {
    const limit = 100;
    const options = {
      ...this.getOptions(),
      searchParams: {
        limit,
        page: 1
      }
    }
    const url = this.getURL() + '/api/activities/'+activity_id;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async deleteActivity(activity_id)
  {
    const options = {
      ...this.getOptions()
    }
    const url = this.getURL() + '/api/activities/'+activity_id;
    let res = await got.delete(url, options);
    return JSON.parse(res.body);
  }

  async deleteActivityPage(activity_id, page_id)
  {
    const options = {
      ...this.getOptions()
    }
    const url = this.getURL() + '/api/activities/'+activity_id+'/ui/pages/'+page_id;
    let res = await got.delete(url, options);
    return JSON.parse(res.body);
  }

  async deleteEntity(entity_id)
  {
    const options = {
      ...this.getOptions()
    }
    const url = this.getURL() + '/api/entities/'+entity_id;
    let res = await got.delete(url, options);
    return JSON.parse(res.body);
  }

  async getProfiles()
  {
    const options = this.getOptions();
    const url = this.getURL() + '/api/profiles';
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getProfilePages(profileId)
  {
    const options = this.getOptions();
    const url = this.getURL() + `/api/profiles/${profileId}/pages`;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getProfileGroups(profileId)
  {
    const options = this.getOptions();
    const url = this.getURL() + `/api/profiles/${profileId}/groups`;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getConfigEntityCommands()
  {
    const limit = 100;
    const options = {
      ...this.getOptions(),
      searchParams: {
        limit,
        page: 1
      }
    }
    const url = this.getURL() + '/api/cfg/entity/commands';
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getMacros()
  {
    const options = this.getOptions();
    const url = this.getURL() + `/api/macros`;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getMacro(macroid)
  {
    const options = this.getOptions();
    const url = this.getURL() + `/api/macros/${macroid}`;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getDrivers()
  {
    const limit = 100;
    const options = {
      ...this.getOptions(),
      searchParams: {
        limit,
        page: 1
      }
    }
    const url = this.getURL() + `/api/intg/drivers`;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getIntegrations()
  {
    const limit = 100;
    const options = {
      ...this.getOptions(),
      searchParams: {
        limit,
        page: 1
      }
    }
    const url = this.getURL() + `/api/intg/instances`;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getIntegrationEntities(intgId, filter)
  {
    const options = {
      ...this.getOptions(),
      searchParams: {
        filter
      }
    }
    const url = this.getURL() + `/api/intg/instances/${intgId}/entities`;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async deleteDriver(driverId)
  {
    const options = this.getOptions();
    const url = this.getURL() + `/api/intg/drivers/${driverId}`;
    let res = await got.delete(url, options);
    return JSON.parse(res.body);
  }

  async uploadIntegration(fileData)
  {
    const formData = new FormData();
    let buffer = fs.readFileSync(fileData.path);
    let blob = new Blob([buffer]);
    let file = new File([blob], fileData.filename, { type: fileData.mimetype });
    formData.append("file", file);
    const options = {
      headers: this.getHeaders(),
      body: formData
      //...formData
    };
    const url = this.getURL() + `/api/intg/install`;
    console.log("Upload file to remote", url, formData, options);
    let res = await got.post(url, options);
    return JSON.parse(res.body);
  }

  async deleteIntegration(integrationId)
  {
    const options = this.getOptions();
    const url = this.getURL() + `/api/intg/instances/${integrationId}`;
    let res = await got.delete(url, options);
    return JSON.parse(res.body);
  }


  async powerRemote(value)
  {
    const options = {
      headers: this.getHeaders(),
      searchParams: {
        cmd: value
      }
    };

    const url = this.getURL() + `/api/system`;
    let res = await got.post(url, options);
    return JSON.parse(res.body);
  }


  async getStatus()
  {
    const options = this.getOptions();
    const url = this.getURL() + "/api/pub/status";
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getBackup(response)
  {
    const options = { headers: this.getHeaders(), throwHttpErrors: false};
    const url = this.getURL() + `/api/system/backup/export`;

    const downloadStream = got.stream(url, options);
    await streamPipeline(
      downloadStream,
      response,
    );

    response.end();

    /*downloadStream
      .on("response", async res => {
        console.log("response");
        downloadStream.off('error', onError);
        try {
          await streamPipeline(
            downloadStream,
            new stream.PassThrough(),
            response,
          );

          console.log('Success');
        } catch (error) {
          onError(error);
        }
      })
      .on("downloadProgress", ({ transferred, total, percent }) => {
        const percentage = Math.round(percent * 100);
        console.log(`progress: ${transferred}/${total} (${percentage}%)`);
      })
      .on("finish", () => {
        console.log("Download backup finished");
        response.end();
      })
      .on("error", (error) => {
        console.error(`Download failed: ${error.message}`);
      });*/
  }
}

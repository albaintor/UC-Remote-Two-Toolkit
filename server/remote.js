import got, {HTTPError, Options} from 'got'
import fs from "node:fs";
import path from "path";
import {pipeline as streamPipeline} from 'node:stream/promises';

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
    let headers = this.getHeaders();
    const limit = 100;
    const options = {
      headers: headers,
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
    let headers = this.getHeaders();
    const options = {
      headers: headers
    }
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

  async register(api_key_name)
  {
    let headers = this.getHeaders();
    const options = {
      headers: headers,
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
    let headers = this.getHeaders();
    const options = {
      headers: headers
    }
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

  async getEntities()
  {
    let headers = this.getHeaders();
    const limit = 100;
    const options = {
      headers: headers,
      searchParams: {
        limit,
        page: 1
      }
    }
    const url = this.getURL() + '/api/entities';
    let res = await got.head(url, options);
    const count = res.headers['pagination-count']
    let entities = [];
    console.log('Get entities', url, options);
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
    let headers = this.getHeaders();
    const limit = 100;
    const options = {
      headers: headers,
      searchParams: {
        limit,
        page: 1
      }
    }
    const url = this.getURL() + '/api/activities';
    let res = await got.head(url, options);
    const count = res.headers['pagination-count']
    let entities = [];
    console.log('Get entities', url, options);
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
    let headers = this.getHeaders();
    const limit = 100;
    const options = {
      headers: headers,
      searchParams: {
        limit,
        page: 1
      }
    }
    const url = this.getURL() + '/api/activities/'+activity_id;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getProfiles()
  {
    let headers = this.getHeaders();
    const options = {
      headers: headers,
    }
    const url = this.getURL() + '/api/profiles';
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getProfilePages(profileId)
  {
    let headers = this.getHeaders();
    const options = {
      headers: headers,
    }
    const url = this.getURL() + `/api/profiles/${profileId}/pages`;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

  async getProfileGroups(profileId)
  {
    let headers = this.getHeaders();
    const options = {
      headers: headers,
    }
    const url = this.getURL() + `/api/profiles/${profileId}/groups`;
    let res = await got.get(url, options);
    return JSON.parse(res.body);
  }

}

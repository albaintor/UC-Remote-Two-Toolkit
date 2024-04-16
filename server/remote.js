import got, {HTTPError, Options} from 'got'

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

  constructor(address, port, user, token, api_key) {
    this.address = address;
    this.port = port;
    this.api_key = api_key;
    this.user = user;
    this.token = token;
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

  getRemoteName()
  {
    let headers = this.getHeaders();
    const options = {
      headers: headers
    }
    const url = this.address + ':' + this.port + '/pub/version';
    console.log('Get remote info', url, options);
    return new Promise( (resolve, reject) => {
      got.get(url, options).then(res => {
        let resBody;
        try {
          if (res?.body) resBody = JSON.parse(res.body);
          console.log('Get remote info :', resBody);
          this.remote_name = resBody.device_name;
          resolve(resBody.device_name);
        } catch (err) {
          console.error('Error', err, res?.body);
          reject(err);
        }
      })
    });
  }

  register(api_key_name)
  {
    let headers = this.getHeaders();
    const options = {
      headers: headers,
      json: {
        name: api_key_name,
        scopes: ["admin"]
      }
    }
    const url = this.address + ':' + this.port + '/auth/api_keys';
    console.log('Register remote', url, options);
    return new Promise( (resolve, reject) => {
      got.post(url, options).then(res => {
        let resBody;
        try {
          if (res?.body) resBody = JSON.parse(res.body);
          this.api_key_name = api_key_name;
          this.api_key = resBody.api_key;
          this.valid_to = resBody.valid_to;
          resolve({api_key: this.api_key, api_key_name: this.api_key_name,
            valid_to: this.valid_to});
        } catch (err) {
          console.error('Error registering remote', err, res?.body);
          reject(err);
        }
      })
    });
  }
}

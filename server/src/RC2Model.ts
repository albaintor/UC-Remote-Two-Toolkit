import fs from 'node:fs';
import path from 'path';

export interface Entity {
  name: any;
  type: string;
  entity_type: string;
}

export class RC2Model
{
  entities_catalog: any = {};
  // {activity_id: {name, entities:[{entity_id, name, integration}], buttons:[{button, entity_id, short_press:True/False}]}}
  activities: any = {};
  // {profile_id : {name, pages:[{page_id, name, entities: [entity_id]]}}
  profiles: any = {}
  activities_entities: any = {};
  // activity_entities: [activity_ids]
  // activity_buttons: [{ activity_id, button, short_press:boolean}]
  // activity_interface: [{page_id, entity_id, command}]
  // pages: [{profile_id, page_id}]
  entities_usage: any = {};
  constructor() {
  }

  init()
  {
    this.entities_catalog = {};
    this.activities = {};
    this.profiles = {}
    this.activities_entities = {};
    this.entities_usage = {};
  }

  getEntity(entityNameOrId: string): {[entityId: string]: Entity}
  {
    const found_entities: any = {}
    if (entityNameOrId in this.entities_catalog || entityNameOrId.toLowerCase() in this.entities_catalog)
    {
      found_entities[entityNameOrId] = {"name": this.entities_catalog[entityNameOrId]['name'],
        "type": this.entities_catalog[entityNameOrId]['type'],
        "entity_type": this.entities_catalog[entityNameOrId]['entity_type']}
    }
    else
    {
      entityNameOrId = entityNameOrId.toLowerCase();
      for (let entity_id in this.entities_catalog)
      {
        const found_entity = this.entities_catalog[entity_id];
        const entity_name = found_entity['name'];
        if (entity_id in found_entities) continue;
        if (entity_id.includes(entityNameOrId) || entity_name.toLowerCase().includes(entityNameOrId))
        {
          found_entities[entity_id] = {"name": entity_name,
            "type": found_entity['type'],
            "entity_type": found_entity['entity_type'],
            "usage": this.entities_usage[entity_id]};
        }
      }
    }
    return found_entities;
  }

  loadFromPath(folderName: string)
  {
    this.init();
    if (fs.existsSync(path.join(folderName, 'system'))) {
      const integrations_path = path.join(folderName, 'system');
      fs.readdirSync(integrations_path).map(fileName => {
        const integration_path = path.join(integrations_path, fileName);
        const entities_path = path.join(integration_path, 'entities');
        const integration_name = path.basename(fileName);
        if (!fs.existsSync(entities_path)) {
          console.log(`Integration not used ${integration_name}`);
          return;
        }
        const new_entities = this.parse_entities_folder(entities_path, integration_name);
        for (let entity_id in new_entities) {
          if (!this.entities_catalog.hasOwnProperty(entity_id))
            this.entities_catalog[entity_id] = new_entities[entity_id];
        }
      })
    }

    if (fs.existsSync(path.join(folderName, 'remotes'))) {
      const remotes_path = path.join(folderName, 'remotes');
      const new_entities = this.parse_entities_folder(remotes_path, 'ir');
      for (let entity_id in new_entities) {
        if (!this.entities_catalog.hasOwnProperty(entity_id))
          this.entities_catalog[entity_id] = new_entities[entity_id];
      }
    }

    if (fs.existsSync(path.join(folderName, 'profiles'))) {
      const profiles_path = path.join(folderName, 'profiles');
      fs.readdirSync(profiles_path).map(fileName => {
        const profile_path = path.join(profiles_path, fileName);
        if (fs.lstatSync(profile_path).isDirectory() || !profile_path.endsWith('.json'))
          return;

        const config_file = fs.readFileSync(profile_path, 'utf-8');
        const profile_data = JSON.parse(config_file);
        const profile_id = profile_data['profile_id'];
        this.profiles[profile_id] = {...profile_data, "filename": fileName, "foldername": "profiles"}
      })
    }

    if (fs.existsSync(path.join(folderName, 'activities'))) {
      const activities_path = path.join(folderName, 'activities');
      fs.readdirSync(activities_path).map(fileName => {
        const activity_path = path.join(activities_path, fileName);
        if (fs.lstatSync(activity_path).isDirectory() || !activity_path.endsWith('.json'))
          return;

        const config_file = fs.readFileSync(activity_path, 'utf-8');
        const activity_data = JSON.parse(config_file);
        const activity_id = activity_data['entity_id'];
        if (activity_id in this.entities_catalog)
          console.error(`Duplicate activity ${activity_id})`);
        else {
          this.entities_catalog[activity_id] = {...activity_data,
            "foldername": 'activities', "filename": fileName};
        }
        this.activities[activity_id] = {...activity_data,
          "foldername": 'activities', "filename": fileName}
      })
    }
  }

  parse_entities_folder(entities_path: string, type: string): {[type: string]: any} {
    const entities:{[type: string]: any} = {};
    fs.readdirSync(entities_path).map(fileName => {
      fileName = path.join(entities_path, fileName);
      if (fs.lstatSync(fileName).isDirectory() || !fileName.endsWith('.json'))
        return;
      const config_file = fs.readFileSync(fileName, 'utf-8');
      const entity_data = JSON.parse(config_file);
      const entity_id = entity_data['entity_id'];
      if (entity_id in entities) {
        console.log(`Duplicate entity ${entity_id} from path ${fileName}`);
      } else {
        entities[entity_id] = {...entity_data, "filename": fileName, "foldername": entities_path};
      }
    })
    return entities
  }
}

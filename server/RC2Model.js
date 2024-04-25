import fs from 'node:fs';
import path from 'path';


export class RC2Model
{
  entities_catalog = {};
  // {activity_id: {name, entities:[{entity_id, name, integration}], buttons:[{button, entity_id, short_press:True/False}]}}
  activities = {};
  // {profile_id : {name, pages:[{page_id, name, entities: [entity_id]]}}
  profiles = {}
  activities_entities = {};
  // activity_entities: [activity_ids]
  // activity_buttons: [{ activity_id, button, short_press:boolean}]
  // activity_interface: [{page_id, entity_id, command}]
  // pages: [{profile_id, page_id}]
  entities_usage = {};
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

  getOrphans()
  {
    const orphans = [];
    for (let entity_id in this.entities_usage)
    {
      const entity = this.entities_usage[entity_id];
      if (entity["activity_entities"].length === 0 &&
        entity["activity_buttons"].length === 0 &&
        entity["pages"].length === 0)
      {
        const entity_ref = this.entities_catalog[entity_id];
        orphans.push({"entity_id": entity_id, "name": entity_ref['name'], "type": entity_ref['type']});
      }
    }
    return orphans;
  }

  getEntity(entityNameOrId)
  {
    const found_entities = {}
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

  loadFromPath(folderName)
  {
    this.init();
    if (fs.existsSync(path.join(folderName, 'integrations'))) {
      const integrations_path = path.join(folderName, 'integrations');
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

  build_entity_usage()
  {
    const entities_usage = {};
    for (let entity_id in this.entities_catalog)
    {
      const entity = this.entities_catalog[entity_id];
      let entity_usage = {"name": entity['name'],
        "type": entity["type"],
        "activity_entities": [], "activity_buttons": [], "activity_interface": [],
        "pages": [], "activity_sequences": []};
      entities_usage[entity_id] = entity_usage
      for (let profile_id in this.profiles)
      {
        const profile = this.profiles[profile_id];
        for (let page_index in profile['pages'])
        {
          const page = profile['pages'][page_index];
          if (page['entities'].includes(entity_id))
          {
            entity_usage['pages'].push({"profile_id": profile_id,
              "page_id": page['page_id'],
              "name": page['name']});
          }
        }
      }
      for (let activity_id in this.activities)
      {
        const activity = this.activities[activity_id];
        const activity_name = activity['name'];
        if (activity['entities'].find(activity_entity => activity_entity['entity_id'] === entity_id))
        {
          entity_usage["activity_entities"].push({"activity_id": activity_id, "name": activity_name});
        }
        const buttons = activity['buttons'].filter(activity_button => activity_button['entity_id'] === entity_id);
        buttons.forEach(button => {
          entity_usage["activity_buttons"].push({"activity_id": activity_id, "name": activity_name,
            "button": button['button'],
            "short_press": button['short_press']});
        });
        //activity_interface
        activity["interface"].forEach(page => {
          page["items"].forEach(item => {
            if (item["entity_id"] === entity_id)
            {
              entity_usage["activity_interface"].push({"activity_id": activity_id, "name": activity_name,
                "page_id": page["page_id"], "page_name": page["name"],
                "command": item["command"]});
            }
          })
        });
        entity_usage["activity_sequences"].push(...activity["sequences"].filter(sequence => sequence.entity_id === entity_id));
      }
    }
    return entities_usage;
  }

  parse_entities_folder(entities_path, type) {
    const entities = {}
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

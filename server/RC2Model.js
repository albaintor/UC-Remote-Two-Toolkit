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
        const config_data = JSON.parse(config_file);
        const profile_id = config_data['profile_id'];
        const profile_name = config_data['name'];
        this.profiles[profile_id] = {"name": profile_name, "pages": [], "filename": fileName, "foldername": "profiles"};
        const profile = this.profiles[profile_id];
        const pages = config_data['pages'];
        if (pages == null)
          return;
        for (let pageId in pages) {
          const page = pages[pageId];
          const page_id = page['page_id'];
          const page_name = page['name'];
          const page_entities = [];
          profile['pages'].push({"page_id": page_id, "name": page_name, "entities": page_entities});
          for (let index in page['items']) {
            const entity_id = page['items'][index]['entity_id'];
            page_entities.push(entity_id);
          }
        }
      })
    }

    if (fs.existsSync(path.join(folderName, 'activities'))) {
      const activities_path = path.join(folderName, 'activities');
      fs.readdirSync(activities_path).map(fileName => {
        const activity_path = path.join(activities_path, fileName);
        if (fs.lstatSync(activity_path).isDirectory() || !activity_path.endsWith('.json'))
          return;

        const config_file = fs.readFileSync(activity_path, 'utf-8');
        const config_data = JSON.parse(config_file);
        const activity_id = config_data['entity_id'];
        const activity_name = config_data['name']['en'];
        if (activity_id in this.entities_catalog)
          console.error(`Duplicate activity ${activity_id})`);
        else {
          this.entities_catalog[activity_id] = {"entity_id": activity_id, "name": activity_name, "type": "activity",
            "foldername": 'activities', "filename": fileName};
        }
        const activity_entities = [];
        const entities = config_data['options']['included_entities'];
        if (entities) {
          for (let index in entities) {
            const entity = entities[index];
            const integration_name = entity['integration']['name']['en'];
            const entity_type = entity['entity_type'];
            const entity_id = entity['entity_id'];
            activity_entities.push({
              "entity_id": entity_id,
              "entity_type": entity_type,
              "integration": integration_name
            });
          }
        }
        const button_mapping = [];
        const button_mappings_data = config_data['options']['button_mapping'];
        if (button_mappings_data) {
          for (let index in button_mappings_data) {
            const button_mapping_data = button_mappings_data[index];
            const button = button_mapping_data['button'];
            const short_press = button_mapping_data['short_press'];
            if (short_press) {
              const entity_id = short_press['entity_id'];
              button_mapping.push({"button": button, "entity_id": entity_id, "short_press": true});
            }
            const long_press = button_mapping_data['long_press'];
            if (long_press) {
              const entity_id = short_press['entity_id'];
              button_mapping.push({"button": button, "entity_id": entity_id, "short_press": false});
            }
          }
        }

        const sequences = [];
        const sequence_data = config_data['options']['sequences'];
        if (sequence_data) {
          ["on", "off"].forEach(sequence_type => {
            if (!sequence_data[sequence_type]) return;
            sequence_data[sequence_type].forEach(sequence => {

              const sequence_data_command = sequence['command'];
              if (!sequence_data_command) return;
              const cmd_id = sequence_data_command['cmd_id'];
              const entity_id = sequence_data_command['entity_id'];
              sequences.push({activity_id, sequence_type, cmd_id, entity_id});
            })
          })
        }

        const interface_mapping = [];
        const interface_mapping_data = config_data['options']['user_interface']['pages'];
        if (interface_mapping_data)
        {
          for (let index in interface_mapping_data)
          {
            const page_data = interface_mapping_data[index];
            const page = {"page_id": page_data["page_id"], "name": page_data["name"], "items": []};
            interface_mapping.push(page);
            for (let item_index in page_data["items"])
            {
              const item = page_data["items"][item_index];
              if (!item["command"]) continue;
              page["items"].push({"entity_id": item["command"]["entity_id"],"command": item["command"]["cmd_id"]});
            }
          }
        }

        this.activities[config_data['entity_id']] = {
          "name": activity_name,
          "entities": activity_entities,
          "buttons": button_mapping,
          "interface": interface_mapping,
          "sequences": sequences
        };
      })
    }

    for (let activity_id in this.activities)
    {
      const activity = this.activities[activity_id];
      this.activities_entities[activity['name']] = [];
      if (!activity['entities']) {
        console.warn(`Empty activity ${activity["name"]} ${activity_id}`)
        continue;
      }
      for (let entity_index in activity['entities'])
      {
        const entity = activity['entities'][entity_index];
        const entity_id = entity['entity_id'];
        const name = activity['name'];
        const integration = entity['integration'];
        const entity_type = entity['entity_type'];
        const entity_def = this.entities_catalog[entity_id];
        if (!entity_def)
        {
          console.warn(`Orphan entity in activity ${activity['name']} ${activity_id} : ${entity_id} ${integration} ${entity_type}`);
          continue;
        }
        this.activities_entities[name].push(entity_def['name']+ " ("+entity_def['type']+")")
      }
    }
    this.entities_usage = this.build_entity_usage();
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
      const config_data = JSON.parse(config_file);
      const entity_id = config_data['entity_id'];
      const name = config_data['name']['en'];
      const entity_type = config_data['entity_type'];
      const features = config_data['features']
      if (entity_id in entities) {
        console.log(`Duplicate entity ${entity_id} from path ${fileName}`);
      } else {
        const new_entity = {
          "entity_id": entity_id,
          "name": name,
          "type": type,
          "entity_type": entity_type,
          "features": [...features],
          "foldername": entities_path,
          "filename": fileName
        }
        entities[new_entity["entity_id"]] = new_entity
      }
    })
    return entities
  }
}

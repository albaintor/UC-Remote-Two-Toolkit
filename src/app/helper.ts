import {Activity, Entity, EntityUsage, Profile, Command, ButtonMapping, UIPage} from "./interfaces";

export class Helper
{
  static getStyle(value: string): any
  {
    try {
      const color = Helper.getBackgroundColor(value);
      return {"background-color" : color};
    } catch (exception)
    {
      return ""
    }
  }

  static getFrontStyle(value: string): any
  {
    try {
      const color = Helper.getFrontColor(value);
      return {"color" : color};
    } catch (exception)
    {
      return ""
    }
  }

  static getFrontColor(stringInput: string) {
    if (stringInput.toLowerCase().startsWith('unknown')) return 'red';
    let stringUniqueHash = [...stringInput].reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return `hsl(${stringUniqueHash % 360}, 95%, 70%)`;
  }

  static getBackgroundColor(stringInput: string) {
    if (stringInput.toLowerCase().startsWith('unknown')) return 'red';
    let stringUniqueHash = [...stringInput].reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return `hsl(${stringUniqueHash % 360}, 95%, 40%)`;
  }

  static fingEntityUsage(entityId: string, entities: Entity[], activities: Activity[], profiles: Profile[]): EntityUsage | null
  {
    const entity = entities.find(entity => entity.entity_id === entityId);
    if (!entity) return null;
    const entityUsage: EntityUsage = {entity, activity_entities: [],
      activity_buttons: [], activity_interface: [],
      activity_sequences: [], pages: []};

    profiles.forEach(profile => {
      profile.pages.forEach(page => {
        if (page.items?.find(item => item.entity_id === entity.entity_id))
          entityUsage.pages.push(page);
      })
    })
    activities.forEach(activity => {
      if (activity?.options?.included_entities?.find(activityEntity => entity.entity_id === activityEntity.entity_id))
      {
        entityUsage.activity_entities.push({activity_id: activity.entity_id!, name: activity.name});
      }
      activity.options?.button_mapping?.filter(button =>
        button.long_press?.entity_id === entity.entity_id ||
        button.short_press?.entity_id === entity.entity_id).forEach(button => {
          if (button.short_press?.entity_id === entity.entity_id)
            entityUsage.activity_buttons.push({activity_id: activity.entity_id!, name: activity.name,
            button: button.button, short_press: (button.short_press?.entity_id === entity.entity_id)});
      });
      activity.options?.user_interface?.pages?.forEach(page => {
        page.items.forEach(item => {
          if (typeof item.command != "string" && (item.command as Command)?.entity_id === entity.entity_id)
          {
            entityUsage.activity_interface.push({activity_id: activity.entity_id!, name: activity.name,
              page_id: page.page_id!, page_name: page.name, command: (item.command as Command).cmd_id
            })
          }
        })
      });
      ['on','off'].forEach(sequenceType => {
        activity.options?.sequences?.[sequenceType]?.
          filter(sequence => sequence.command?.entity_id == entity.entity_id).forEach(sequence => {
          entityUsage.activity_sequences.push({activity_id: activity.entity_id!, sequence_type: sequenceType,
          cmd_id: sequence.command?.cmd_id!});
        })
      })
    })
    return entityUsage;
  }

  static compareButtons(button1: ButtonMapping, button2: ButtonMapping | undefined): boolean {
    if (!button2) return false;
    if (button1.short_press && !button2.short_press) return false;
    if (button1.long_press && !button2.long_press) return false;
    if (button2.short_press && !button1.short_press) return false;
    if (button2.long_press && !button1.long_press) return false;
    if (button1.short_press?.cmd_id != button2.short_press?.cmd_id ||
      button1.short_press?.entity_id != button2.short_press?.entity_id) return false;
    return !(button1.long_press?.cmd_id != button2.long_press?.cmd_id ||
      button1.long_press?.entity_id != button2.long_press?.entity_id);
  }

  static comparePages(page1: UIPage, page2: UIPage): boolean
  {
    if ((!page1 && page2) || (!page2 && page1)) return false;
    if (page1.page_id != page2.page_id || page1.name != page2.name) return false;
    if ((!page1.grid && page2.grid) || (page1.grid && !page2.grid)) return false;
    if(page1.grid && page2.grid &&
      (page1.grid.width != page2.grid.width || page1.grid.height != page2.grid.height)) return false;
    for (let item of page1.items)
    {
      const item2 = page2.items.find(item2 =>
        item2.location.x === item.location.x && item2.location.y === item.location.y &&
        item2.size.width === item.size.width && item2.size.height === item.size.height);
      if (!item2) return false;
      if (item.media_player_id && item.media_player_id != item2.media_player_id) return false;
      if (item.command && (item.command as Command)?.entity_id != (item2.command as Command)?.entity_id &&
        (item.command as Command).cmd_id != (item2.command as Command)?.cmd_id) return false;
    }
    return true;
  }

  static queryEntity(query: string, entities: Entity[]): Entity[]
  {
    query = query.toLowerCase();
    const suggestions = entities.filter(entity => entity.entity_id?.toLowerCase().includes(query) ||
      entity.name?.toLowerCase().includes(query));
    suggestions.sort((a, b) => {
      return (a.name ? a.name : "").localeCompare(b.name ? b.name : "");
    })
    if (suggestions.length == 0)
    {
      return [{entity_id: query, name: query, entity_type: ""}];
    }
    return suggestions;
  }

  static getActivityEntities(activity: Activity, entities: Entity[]): Entity[]
  {
    const entityIds = new Set<string>();
    activity.options?.included_entities?.forEach(entity => entityIds.add(entity.entity_id!));
    ['on','off'].forEach(sequenceType => activity.options?.sequences?.[sequenceType]?.forEach(sequence => {
      if (sequence.command?.entity_id!)
        entityIds.add(sequence.command.entity_id)
    }))
    activity.options?.user_interface?.pages?.forEach(page => page.items.forEach(item => {
      if (item.media_player_id) entityIds.add(item.media_player_id);
      if (item.command && (item.command as Command)?.entity_id)
        entityIds.add((item.command as Command).entity_id);
    }))
    activity.options?.button_mapping?.forEach(button => {
      if (button.short_press?.entity_id)
        entityIds.add(button.short_press.entity_id);
      if (button.long_press?.entity_id)
        entityIds.add(button.long_press.entity_id);
    })
    const activityEntities: Entity[] = [];
    entityIds.forEach(entityId => {
      const entity = entities.find(entity => entity.entity_id === entityId);
      if (entity) activityEntities.push(entity);
      else console.error(`Entity ${entityId} not found in the catalog`);
    })
    return activityEntities;
  }

  static findExistingMatchPage(activity: Activity, width: number, height: number): UIPage | null
  {
    console.log("Find existing page", activity, width, height);
    if (activity.options?.user_interface?.pages)
    for (let existingPage of activity.options.user_interface.pages)
    {
      if (existingPage.items?.length != 0) continue;
      if (existingPage.grid.width === width && existingPage.grid.height === height)
        return existingPage;
    }
    return null;
  }
}

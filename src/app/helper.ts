import {Activity, Entity, EntityUsage, Profile, Command, ActivityButtonMapping} from "./interfaces";

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

  static compareButtons(button1: ActivityButtonMapping, button2: ActivityButtonMapping | undefined): boolean {
    if (!button2) return false;
    if (button1.short_press?.cmd_id != button2.short_press?.cmd_id ||
      button1.short_press?.entity_id != button2.short_press?.entity_id) return false;
    if (button1.long_press?.cmd_id != button2.long_press?.cmd_id ||
      button1.long_press?.entity_id != button2.long_press?.entity_id) return false;
    return true;
  }
}

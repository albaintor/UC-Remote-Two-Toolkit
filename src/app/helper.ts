import {
  Activity,
  Entity,
  EntityUsage,
  Profile,
  Command,
  ButtonMapping,
  UIPage,
  Remote,
  ActivityPageCommand, OrphanEntity, CommandSequence
} from "./interfaces";

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
        entityUsage.activity_entities.push({activity_id: activity.entity_id!, name: Helper.getEntityName(activity)});
      }
      activity.options?.button_mapping?.filter(button =>
        button.long_press?.entity_id === entity.entity_id ||
        button.short_press?.entity_id === entity.entity_id ||
        button.double_press?.entity_id === entity.entity_id).forEach(button => {
          if (button.short_press?.entity_id === entity.entity_id)
            entityUsage.activity_buttons.push({activity_id: activity.entity_id!, name: Helper.getEntityName(activity),
            button: button.button, short_press: (button.short_press?.entity_id === entity.entity_id),
            double_press: button.double_press?.entity_id === entity.entity_id});
      });
      activity.options?.user_interface?.pages?.forEach(page => {
        page.items.forEach(item => {
          if (typeof item.command != "string" && (item.command as Command)?.entity_id === entity.entity_id)
          {
            entityUsage.activity_interface.push({activity_id: activity.entity_id!, name: Helper.getEntityName(activity),
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
    if (button1.double_press && !button2.double_press) return false;
    if (button2.short_press && !button1.short_press) return false;
    if (button2.long_press && !button1.long_press) return false;
    if (button2.double_press && !button1.double_press) return false;
    if (button1.short_press?.cmd_id != button2.short_press?.cmd_id ||
      button1.short_press?.entity_id != button2.short_press?.entity_id) return false;
    if (button1.long_press?.cmd_id != button2.long_press?.cmd_id ||
      button1.long_press?.entity_id != button2.long_press?.entity_id) return false;
    if (button1.double_press?.cmd_id != button2.double_press?.cmd_id ||
      button1.double_press?.entity_id != button2.double_press?.entity_id) return false;
    return true;
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

  static compareSequences(sequence1: CommandSequence, sequence2: CommandSequence): boolean
  {
    if (sequence1.type !== sequence2.type) return false;
    if (sequence1.delay && (!sequence2.delay || sequence2.delay !== sequence2.delay)) return false;
    if (sequence1.command && !sequence2.command) return false;
    if (sequence2.command && !sequence1.command) return false;
    if (sequence2.command && sequence1.command)
    {
      if (sequence1.command.cmd_id != sequence2.command.cmd_id) return false;
      if (sequence1.command?.entity_id != sequence2.command?.entity_id) return false;
      if (sequence1.command.params && !sequence2.command.params) return false;
      if (sequence2.command.params && !sequence1.command.params) return false;
      if (sequence1.command.params && sequence2.command.params)
      {
        if (JSON.stringify(sequence1.command.params) !== JSON.stringify(sequence2.command.params)) return false;
      }
    }
    return true;
  }

  static queryEntity(query: string, entities: Entity[]): Entity[]
  {
    query = query.toLowerCase();
    const suggestions = entities.filter(entity => entity.entity_id?.toLowerCase().includes(query) ||
      Helper.getEntityName(entity)!.toLowerCase().includes(query));
    suggestions.sort((a, b) => {
      return (a.name ? Helper.getEntityName(a): "")!.localeCompare(b.name ? Helper.getEntityName(b)! : "");
    })
    if (suggestions.length == 0)
    {
      return [{entity_id: query, name: query, entity_type: ""}];
    }
    return suggestions;
  }

  /*static getActivityEntities(activity: Activity, entities: Entity[]): Entity[]
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
  }*/

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

  static swapElements(array:any[], index1: number, index2: number) {
    let temp = array[index1];
    array[index1] = array[index2];
    array[index2] = temp;
  }

  static isStandardIcon(icon: string | undefined): boolean {
    if (!icon) return false;
    return icon?.startsWith("uc:");
  }

  static isCustomIcon(icon: string | undefined): boolean {
    if (!icon) return false;
    return !icon?.startsWith("uc:");
  }

  static getIconClass(icon?: string): string
  {
    if (icon?.startsWith("uc:"))
      return "icon icon-" + icon.replace("uc:", "")
    return ""
  }

  static getIconURL(remote: Remote, icon: string | undefined) {
    if (!icon) return "";
    const filename = icon.replace("custom:", "");
    return `/api/remote/${remote?.address}/resources/Icon/${filename}`;
  }

  static getEntityName(entity: any): string
  {
    if (!entity) return "";
    if (typeof entity.name === "string") return entity.name;
    if (entity.name?.['en']) return entity.name['en'];
    if (entity.name?.['fr']) return entity.name['fr'];
    return "";
  }

  static isIntersection(rectangle1: {x: number, y: number, width: number, height:number},
                        rectangle2: {x: number, y: number, width: number, height:number}): boolean
  {
    return !( rectangle1.x >= (rectangle2.x + rectangle2.width) ||
      (rectangle1.x + rectangle1.width) <=  rectangle2.x ||
      rectangle1.y >= (rectangle2.y + rectangle2.height) ||
      (rectangle1.y + rectangle1.height) <=  rectangle2.y);
  }

  static fillSquare(matrix: boolean[][], x: number, y: number, width: number, height: number)
  {
    for (let row=y; row<y+height; row++) {
      for (let col=x; col<x+width; col++) {
        matrix[row][col] = true;
      }
    }
  }

  static findItem(list: ActivityPageCommand[], x: number, y: number): boolean
  {
    for (let item of list)
    {
      if (!item) continue;
      if (Helper.isIntersection({x: item.location.x, y: item.location.y, width: item.size.width, height: item.size.height},
        {x, y, width: 1, height: 1}))
      {
        return true;
      }
    }
    return false;
  }

  static isSameSize(item1: ActivityPageCommand, item2: ActivityPageCommand)
  {
    return item1.size.width == item2.size.width && item1.size.height == item2.size.height;
  }

  static isEmptyItem(item: ActivityPageCommand | undefined)
  {
    if (!item) return true;
    return item.media_player_id == undefined && item.icon == undefined && item.text == undefined &&
      (item.command == undefined || (item.command as Command)?.entity_id == undefined);
  }

  static checkItemOverflow(x: number, y: number, width: number, height: number,
                           gridWidth: number, gridHeight: number): boolean
  {
    return !(x + width > gridWidth || y + height > gridHeight);
  }

  static checkItem(item: ActivityPageCommand,list: ActivityPageCommand[], x: number, y: number, width: number, height: number): boolean
  {
    for (let existingItem of list)
    {
      if (!existingItem || Helper.isEmptyItem(existingItem) || item == existingItem) continue;
      if (Helper.isIntersection({x: existingItem.location.x, y: existingItem.location.y, width: existingItem.size.width, height: existingItem.size.height},
        {x, y, width, height}))
      {
        console.log("Intersection", item, existingItem);
        return false;
      }
    }
    return true;
  }

  static getItemPosition(grid: (ActivityPageCommand | null)[], index: number, gridWidth: number, gridHeight: number): {x: number, y: number, width: number, height: number} | null
  {
    const matrix: boolean[][] = new Array(gridHeight)
      .fill(false)
      .map(() =>
        new Array(gridWidth).fill(false)
      );
    let x= 0, y = 0;
    for (let i=0; i < grid.length; )
    {
      let width = 1, height = 1;
      if (grid[i] && grid[i]?.size)
      {
        width = grid[i]!.size.width!;
        height = grid[i]!.size.height!;
      }
      for (let row =0; row < matrix.length; row++)
      {
        for (let col = 0; col < matrix[row].length; col++)
        {
          if (matrix[row][col]) continue;
          if (col+width > gridWidth) break;
          let rowFilled = false;
          for (let col2 = col; col2 < width; col2++)
          {
            if (matrix[row][col2])
            {
              rowFilled = true;
              break;
            }
          }
          if (rowFilled) break;
          if (index == i) return {x: col, y: row, width: width, height: height};
          Helper.fillSquare(matrix, col, row, width, height);
          i++;
        }
      }
    }
    return null;
  }

  static getOrphans(activities: Activity[], entities: Entity[]): OrphanEntity[]
  {
    // Add orphan entities
    const orphanEntities: OrphanEntity[] = [];
    activities.forEach(activity => {
      activity.options?.included_entities?.forEach(include_entity => {
        if (!entities.find(entity => entity.entity_id == include_entity.entity_id)) {
          let orphanEntity = orphanEntities.find(
            orphanEntity => orphanEntity.entity_id == include_entity.entity_id);
          if (!orphanEntity) {
            orphanEntity = {...include_entity, activities: [activity]};
            orphanEntities.push(orphanEntity);
          }
          else
            orphanEntity.activities?.push(activity)
        }
      })
    })
    return orphanEntities;
  }

  static getUnusedEntities(activities: Activity[], profiles:Profile[], entities: Entity[]): Entity[]
  {
    // Add orphan entities
    const unusedEntities: Entity[] = [];
    entities.forEach(entity => {
      // if (entity.entity_type == "activity") return;
      if (activities.find(activity => activity.options?.included_entities?.
        find(included_entity => included_entity.entity_id == entity.entity_id))) {
        return;
      }
      for (let profile of profiles)
      {
        for (let page of profile.pages)
        {
          if (!page.items) continue;
          for (let item of page.items)
          {
            if (item.entity_id == entity.entity_id)
              return;
          }
        }
        if (profile.groups)
        for (let group of profile.groups)
        {
          if (group.entities.includes(entity.entity_id!))
            return;
        }
      }
      unusedEntities.push(entity);
    })
    return unusedEntities;
  }

  static getValues(table: any[], field_name: string) {
    const values = new Set<any>();
    table.forEach(item => {
      if (item?.[field_name]) {
        values.add(item?.[field_name])
      }
    });
    return Array.from(values).sort();
  }

  static getItems(table: any[], field_name: string) {
    return Helper.getValues(table, field_name).map(value => {
      return {name: value.toString(), value}
    });
  }

  static getSelectedRemote(remotes: Remote[]): Remote | undefined
  {
    const selectedRemoteAddress = localStorage.getItem('remote');
    if (selectedRemoteAddress)
    {
      const address = selectedRemoteAddress.split(":")[0];
      let port = "80";
      if (selectedRemoteAddress.includes(":"))
        port = selectedRemoteAddress.split(":")[1];
      return remotes.find(remote => remote.address === address &&
        remote.port === port)
    }
    return undefined;
  }

  static setRemote(remote: Remote): void
  {
    localStorage.setItem('remote', `${remote.address}:${remote.port}`);
  }
}

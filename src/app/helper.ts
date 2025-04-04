import {
  Activity,
  ActivityPageCommand,
  ButtonMapping,
  Command,
  CommandSequence,
  Driver,
  Entity,
  EntityCommand,
  EntityCommandParameter, EntityFeature,
  EntityIntegration,
  EntityUsage,
  Integration,
  LanguageCode,
  LanguageName,
  Macro,
  OrphanEntity,
  Profile,
  Remote,
  UIPage
} from "./interfaces";
import {MediaEntityState} from "./websocket/remote-websocket-instance";
import {ActivityChange, ActivityChangeType} from "./activity-viewer/activity-viewer.component";

export interface LocalizedName {
  languageCode: LanguageCode;
  languageName: string;
  name: string;
}

export class Helper
{
  static languageName: LanguageCode = 'en';
  static iconsMap: Map<string, string> = new Map();

  static getLanguageName(): LanguageCode
  {
    return Helper.languageName;
  }

  static getLanguages()
  {
    return [
      {label:'English', value:'en'},
      {label:'Français', value:'fr'},
      {label:'Deutsch', value:'de'},
    ]
  }

  static getLanguageNameFromCode(code: LanguageCode)
  {
    switch(code)
    {
      case "en": return "English";
      case "fr": return "Français";
      case "de": return "Deutsch";
      default: return "Unknown";
    }
  }

  static setLanguageName(languageCode: LanguageCode)
  {
    Helper.languageName = languageCode;
  }

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
    if (page1.name != page2.name) return false;
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
      if (item.type == 'text' && item2.text !== item.text) return false;
      if (item.type == 'icon' && item2.icon !== item.icon) return false;
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
      return [{entity_id: query, ...Helper.buildName(query), entity_type: ""}];
    }
    return suggestions;
  }

  static replaceEntity(activity: Activity, entities: Entity[], entity_id: string, new_entity_id: string): ActivityChange[]
  {
    const activityChanges: ActivityChange[] = [];
    const newEntity = entities.find(entity => entity.entity_id === new_entity_id);
    if (!activity || !newEntity) return activityChanges;
    if (!activity.options?.included_entities?.find(entity => entity.entity_id === new_entity_id)) {
      activity?.options!.included_entities!.push(newEntity);
      activityChanges.push({type: ActivityChangeType.AddIncludedEntity, includedEntityId: newEntity.entity_id})
    }

    if (activity.options?.included_entities?.find(entity => entity.entity_id === entity_id)) {
      activity.options.included_entities?.splice(
        activity.options.included_entities?.indexOf(
          activity.options.included_entities.find(entity => entity.entity_id === entity_id)!), 1);
      activityChanges.push({type: ActivityChangeType.DeleteIncludedEntity, includedEntityId: entity_id});
    }

    activity?.options?.button_mapping?.forEach(button => {
      let found = false;
      if (button.long_press?.entity_id === entity_id) {
        button.long_press.entity_id = new_entity_id;
        found = true;
      }
      if (button.short_press?.entity_id === entity_id) {
        button.short_press.entity_id = new_entity_id;
        found = true;
      }
      if (button.double_press?.entity_id === entity_id) {
        button.double_press.entity_id = new_entity_id;
        found = true;
      }
      if (found) activityChanges.push({type: ActivityChangeType.ModifiedButton, button});
    })
    activity?.options?.user_interface?.pages?.forEach(page => {
      page?.items?.forEach(item => {
        let found = false;
        if (item.command && typeof item.command === "string" && (item.command as string) === entity_id) {
          item.command = new_entity_id;
          found = true;
        }
        else if (item.command && (item.command as Command)?.entity_id === entity_id) {
          (item.command as Command).entity_id = new_entity_id;
          found = true;
        }
        if (item.media_player_id === entity_id) {
          item.media_player_id = new_entity_id;
          found = true;
        }
        if (found && !activityChanges.find(item => item.type === ActivityChangeType.ModifiedPage &&
          (page?.page_id && item.page?.page_id === page.page_id ||
            (!page?.page_id && page.name === item.page?.name))))
          activityChanges.push({type: ActivityChangeType.ModifiedPage, page});
      })
    });
    ['on', 'off'].forEach(type => {
      if (activity?.options?.sequences?.[type])
      {
        for (const [position, sequence] of activity.options.sequences[type].entries())
        {
          if (sequence.command?.entity_id === entity_id) {
            sequence.command!.entity_id = new_entity_id;
            activityChanges.push({type: ActivityChangeType.ModifiedSequence, sequence: {type, sequence, position}});
          }
        }
      }
    })
    return activityChanges;
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
    if (!icon) return "";
    if (icon?.startsWith("uc:"))
      icon = icon.replace("uc:", "")
    const remap = Helper.iconsMap.get(icon);
    if (remap) return "fa-light fa-" + remap;
    return "fa-light fa-" + icon
  }

  static getIconURL(remote: Remote, icon: string | undefined) {
    if (!icon) return "";
    const filename = icon.replace("custom:", "");
    return `/api/remote/${remote?.address}/resources/Icon/${filename}`;
  }

  static getParamValue(command: Command | undefined | string, param: string): string
  {
    if (!command || typeof command === 'string') return "";
    return command.params?.[param];
  }

  static getParams(command: Command | undefined | string): string[]
  {
    if (!command) return [];
    if ((command as any)?.params)
      return Object.keys((command as any)?.params);
    return [];
  }

  static getCommandName(command: Command | undefined | string, configEntityCommands: EntityCommand[] | undefined): string
  {
    if (!command) return "";
    if (typeof command === 'string') return command;
    if (!configEntityCommands) return command.cmd_id;
    const config = configEntityCommands.find(item => command.cmd_id === item.id);
    if (!config) return command.cmd_id;
    return Helper.getEntityName(config);
  }

  static getParam(command: Command | undefined | string, param: string, configEntityCommands: EntityCommand[] | undefined): EntityCommandParameter | undefined
  {
    if (!command || typeof command === 'string') return undefined;
    if (!configEntityCommands) return undefined;
    const config = configEntityCommands.find(item => command.cmd_id === item.id);
    if (!config) return undefined;
    return config.params?.find(item => item.param === param);
  }

  static buildName(name: string): LanguageName
  {
    if (Helper.getLanguageName() === 'en') return {'en': name};
    let obj: any = {'en': name};
    obj[Helper.getLanguageName()] = name;
    return obj;
  }

  static getEntityName(entity: any): string
  {
    if (!entity) return "";
    if (entity?.[Helper.getLanguageName()]) return entity[Helper.getLanguageName()];
    else if (entity?.['en']) return entity['en'];
    if (typeof entity.name === "string") return entity.name;
    if (entity.name?.[Helper.getLanguageName()]) return entity.name[Helper.getLanguageName()];
    if (entity.name?.['en']) return entity.name['en'];
    return "";
  }

  static getEntityNames(entity: Entity | Activity | Macro | Integration | Driver | EntityIntegration): LocalizedName[]
  {
    if (!entity || !entity.name) return [];
    const names: LocalizedName[] = []
    for (let languageCode in entity.name)
    {
      names.push({languageCode: languageCode as LanguageCode,
        languageName: Helper.getLanguageNameFromCode(languageCode as LanguageCode),
        name: entity.name[languageCode]})
    }
    return names;
  }

  static getEntityNameFromCatalog(entity: any, entities: Entity[]): string
  {
    if (!entity) return "";
    let entityId = undefined;
    if (typeof entity === "string") entityId = entity;
    if (entity.entity_id) entityId = entity.entity_id;
    if (entityId)
    {
      const entityContent = entities.find(item => item.entity_id === entityId);
      if (entityContent) return Helper.getEntityName(entityContent);
      return entityId;
    }
    return entity.toString();
  }

  static getEntityType(entity: any): string
  {
    if (!entity?.entity_type) return "";
    switch(entity.entity_type)
    {
      case "media_player": return "media player";
      case "remote": if (entity.integration && typeof entity.integration === "string") return Helper.getEntityTypeFromIntegration(entity);
        if (entity.entity_id.startsWith("uc.main")) return "IR remote";
        if (entity.entity_id.startsWith("uc_bt")) return "BR remote";
        return "remote";
      default:return entity.entity_type;
    }
  }

  static getEntityTypeFromIntegration(entity: any): string
  {
    if (entity.integration === "uc.main") return "IR remote";
    if (entity.integration === "uc_bt.main") return "BT remote";
    return entity.entity_type;
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
      const size = {width: 1, height: 1};
      if (item.size)
      {
        size.width = item.size.width;
        size.height = item.size.height;
      }
      if (Helper.isIntersection({x: item.location.x, y: item.location.y, width: size.width, height: size.height},
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

  static findRoom(newItems: ActivityPageCommand[], grid: ActivityPageCommand[], width: number, height: number): ActivityPageCommand[]
  {
    const gridCopy: ActivityPageCommand[] = [...grid];
    const newItemsMapped: ActivityPageCommand[] = [];
    newItems.forEach(item => {
      for (let x=0; x<width; x++)
      {
        for (let y=0; y<height; y++)
        {
          const existingItem = gridCopy.find(item => item.location.x === x && item.location.y === y);
          if (!Helper.isEmptyItem(existingItem)) continue;
          if (Helper.checkItem(item, gridCopy, x, y, item!.size.width, item!.size.height))
          {
            const newItem = {...item};
            newItem.location = {x, y};
            newItemsMapped.push(newItem);
            return;
          }
        }
      }
    });
    console.debug("Find room", newItems, width, height, newItemsMapped);
    return newItemsMapped;
  }

  static getGridMinSize(grid: (ActivityPageCommand | null)[]): {width: number, height: number}
  {
    const gridSize = {width: 1, height: 1};
    grid.forEach(item => {
      if (!item || Helper.isEmptyItem(item)) return;
      if (item.location.x + item.size.width > gridSize.width)
        gridSize.width = item.location.x + item.size.width;
      if (item.location.y + item.size.height > gridSize.height)
        gridSize.height = item.location.y + item.size.height;
    });
    return gridSize;
  }

  static getItemPosition(grid: (ActivityPageCommand | null)[], index: number, gridWidth: number, gridHeight: number): {x: number, y: number, width: number, height: number} | null
  {
    if (gridWidth <= 0 || gridHeight <= 0 || grid.length == 0) return null;
    const matrix: boolean[][] = new Array(gridHeight)
      .fill(false)
      .map(() =>
        new Array(gridWidth).fill(false)
      );
    for (let i=0; i < grid.length; )
    {
      let width = 1, height = 1;
      if (grid?.[i]?.size)
      {
        width = grid[i]?.size.width ? grid[i]!.size.width : 1;
        height = grid[i]?.size.height ? grid[i]!.size.height : 1;
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
        }
      }
      i++;
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

  static resolve(stringPath: string, baseObject: any): any | null {
    return stringPath.split('.').reduce((p, q) => {
      return p ? p[q] : null;
    }, baseObject|| self);
  }

  static getValues(table: any[], field_name?: string) {
    const values = new Set<any>();
    table.forEach(item => {
      if (!field_name) {
        values.add(item);
        return;
      }
      const value = Helper.resolve(field_name, item);
      if (value) {
        values.add(value)
      }
    });
    return Array.from(values).sort();
  }

  static getItems(table: any[], field_name?: string) {
    return Helper.getValues(table, field_name).map(value => {
      return {name: value.toString(), value}
    });
  }

  static getItemsConverted(table: any[], field_name: string, callback: (value: any) => string) {
    return Helper.getValues(table, field_name).map(value => {
      return {name: callback(value), value}
    });
  }

  static getSelectedRemote(remotes: Remote[]): Remote | undefined
  {
    const selectedRemoteAddress = localStorage.getItem('remote');
    if (remotes && selectedRemoteAddress)
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

  static formatDuration(duration: number): string {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration - (hours * 3600)) / 60);
    const seconds = duration - (hours * 3600) - (minutes * 60);
    return hours.toString().padStart(2, '0') + ':' +
      minutes.toString().padStart(2, '0') + ':' +
      seconds.toString().padStart(2, '0');
  }

  static setScale(scale: number) {
    localStorage.setItem("scale", scale.toString());
  }

  static checkFeature(entity: Entity|undefined, feature: string | string[]): boolean
  {
    const features = (Array.isArray(feature)) ? feature as string[] : [feature];
    return entity?.features?.find(item => features.includes(item)) !== undefined;
  }

  static getNumber(number: number) {
    if (isNaN(number)) return 0;
    return Math.round(number);
  }

  static isMuted(volumeEntity: MediaEntityState | undefined) {
    if (!volumeEntity?.new_state?.attributes) return false;
    return !!volumeEntity?.new_state?.attributes.muted;
  }

  static compareActivitySequences(activity1: Activity, activity2: Activity): {[type: string]: CommandSequence[]}
  {
    const diff: {[type: string]: CommandSequence[]} = {};

    if (activity1.options?.sequences)
    {
      for (let sequenceName in activity1.options.sequences)
      {
        const sequences1 = activity1.options.sequences[sequenceName];
        const sequences2 = activity2.options?.sequences?.[sequenceName];
        // Sequences1 not empty and sequences2 empty
        if (sequences1.length > 0 && (!sequences2 || sequences2.length == 0))
        {
          diff[sequenceName] = sequences1;
        }
        else if (sequences1.length > 0 && sequences2 && sequences2.length > 0) // Sequences 1 not empty
        {
          for (let i=0; i<sequences1.length; i++)
          {
            const sequence1 = sequences1[i];
            if (sequences2.length < i+1)
            {
              if (!diff[sequenceName]) diff[sequenceName] = [];
              diff[sequenceName].push(sequence1);
            }
            else
            {
              const sequence2 = sequences2[i];
              if (!Helper.compareSequences(sequence2, sequence2))
              {
                if (!diff[sequenceName]) diff[sequenceName] = [];
                diff[sequenceName].push(sequence1);
              }
            }
          }
        }
      }
      if (activity2.options?.sequences)
        for (let sequenceName in activity2.options.sequences) {
          const sequences2 = activity2.options.sequences[sequenceName];
          const sequences1 = activity1.options.sequences[sequenceName];
          if (sequences2.length > 0 && (!sequences1 || sequences1.length == 0))
          {
            diff[sequenceName] = sequences2;
          }
          else
          {
            if (sequences2.length > sequences1.length) {
              for (let i = sequences1.length; i < sequences2.length; i++) {
                if (!diff[sequenceName]) diff[sequenceName] = [];
                diff[sequenceName].push(sequences2[i]);
              }
            }
          }
        }
    } else if (activity2.options?.sequences)
    {
      for (let sequenceName in activity2.options.sequences) {
        const sequences2 = activity2.options.sequences[sequenceName];
        if (sequences2.length > 0)
        {
          diff[sequenceName] = sequences2;
        }
      }
    }
    return diff;
  }

  static compareActivityEntities(activity1: Activity, activity2: Activity): {entityId: string, missing1: boolean}[]
  {
    const results: {entityId: string, missing1: boolean}[] = [];
    activity1.options?.included_entities?.forEach(entity1 => {
      if (!activity2.options?.included_entities
        || !activity2.options.included_entities.find(entity2 => entity1.entity_id === entity2.entity_id))
        results.push({entityId: entity1.entity_id!, missing1: false})
    })

    activity2.options?.included_entities?.forEach(entity2 => {
      if (!activity1.options?.included_entities
        || !activity1.options.included_entities.find(entity1 => entity1.entity_id === entity2.entity_id))
        results.push({entityId: entity2.entity_id!, missing1: true})
    })
    return results;
  }

  static checkCommandCompatibility(featuresMap: EntityFeature[], entity: Entity, command: string): boolean {
    if (!entity.features) return true;
    const features = featuresMap.find(item => item.entity_type === entity.entity_type);
    if (!features) return true;
    const feature = features.features_map.find(item => item.commands.includes(command))
    if (!feature || !feature.feature) return true;
    return entity.features.includes(feature.feature);
  }
}

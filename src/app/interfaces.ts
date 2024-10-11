export interface EntityFeature
{
  entity_type: string;
  features_map: [
    {
      commands: string[];
      feature?: string;
    }
  ]
}

export interface EntityCommandParameter {
  items?:{
    field: string;
    source: string;
  }
  name: {
    en: string;
    fr?: string;
    de?: string
  }
  param?: string;
  type: "enum"|"number"|"regex"|"bool"|"selection";
  values?: string[];
  default?: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  source?: string;
}

export interface EntityCommand
{
  id: string;
  cmd_id: string;
  name: {
    en: string;
    fr?: string;
    de?: string
  }
  params?: EntityCommandParameter[];
}


export interface RemoteRegistration
{
  key_id: string;
  name: string;
  prefix: string;
  active: boolean;
  valid_to: string;
  description: string;
  creation_date: string;
  scopes: string[];
}

export interface RemoteVersion
{
  device_name: string,
  hostname: string,
  address: string,
  api: string,
  core: string,
  ui: string,
  os: string,
  integrations: {
    additionalProp1: string,
    additionalProp2: string,
    additionalProp3: string
  }
}

export interface RemoteStatus
{
  memory: {
    total_memory: number,
    available_memory: number,
    used_memory: number,
    total_swap: number,
    used_swap: number
  },
  load_avg: {
    one: number,
    five: number,
    fifteen: number
  },
  filesystem: {
    user_data: {
      available: number,
      used: number
    }
  }
}

export enum OperationStatus
{
  Todo ,
  Done ,
  Error,
  Cancelled
}

export interface RemoteOperation
{
  method: "PUT" | "POST" | "DELETE" | "PATCH";
  activity?: Activity;
  name?: string;
  api: string;
  body: any;
  status?: OperationStatus;
  results?: any;
  message?: any;
  resultFields?: RemoteOperationResultField[];
}

export interface RemoteOperationResultField
{
  fieldName: string;
  keyName: string;
  linkedOperation: RemoteOperation;
}

export interface RemoteButtonMap
{
  button: string;
  cmd_id: string;
  feature: string;
  simple_command?: boolean;
  disabled?: boolean;
  long_press?: boolean;
  params?: any;
}

export interface RemotePageItem
{
  feature?: string;
  command: {
    cmd_id: string;
    params?: any;
  }
  location?: {
    x: number;
    y: number;
  }
  size: {
    width: number;
    height: number;
  }
  type: "icon" | "text" | "media_player";
  icon?: string;
  text?: string;
}

export interface RemoteButtonPage
{
  name?: string;
  features?: string[];
  grid: {
    height: number;
    width: number;
  };
  items: RemotePageItem[];
}

export interface RemoteMap
{
  entity_type: string;
  unmap_features?: string[];
  buttons?: RemoteButtonMap[];
  user_interface?: {
    pages: RemoteButtonPage[]
  };
}

export interface Config
{
  language: string;
  remotes?: Remote[];
}
export interface Remote
{
  remote_name?: string;
  address: string;
  port: string;
  user: string;
  token: string;
  api_key?: string;
  api_key_name?: string;
  api_valid_to?: string;
}


export interface Context
{
  source: string;
  date: Date;
  remote_name?: string;
  remote_ip?: string;
  type?: string;
}

export interface EntityIntegration {
  name?: string | LanguageName;
  icon?: string;
}

export interface Entity
{
  name?: string | LanguageName;
  icon?: string;
  entity_id?: string;
  entity_type: string;
  integration?: string | EntityIntegration;
  features?:string[];
  attributes?: any;
  options?: {
    button_mapping?:ButtonMapping[];
    user_interface?: {
      pages?: UIPage[];
    }
    simple_commands?: string[];
  }
  foldername?: string;
  filename?: string;
  entity_commands?: string[];
}

export interface EntitiesUsage
{
  [entity_id: string] : EntityUsage;
}

export interface ActivityEntityUsage
{
  activity_id: string;
  name: string;
}

export interface ActivityInterfaceUsage
{
  activity_id: string;
  name: string;
  page_id: string;
  page_name: string;
  command: string;
}

export interface EntityUsage
{
  entity: Entity;
  activity_entities: ActivityEntityUsage[];
  activity_buttons: ActivityButtonUsage[];
  activity_interface: ActivityInterfaceUsage[];
  activity_sequences: ActivitySequenceUsage[];
  pages: Page[];
}

export interface Profiles
{
  [profile_id: string] : Profile
}

export interface ProfileGroup
{
  group_id: string;
  profile_id: string;
  name: string;
  icon?: string;
  entities: string[];
}

export interface Profile
{
  profile_id: string;
  name: string;
  pages: Page[];
  filename?: string;
  foldername?: string;
  groups?: ProfileGroup[];
}

export interface Page {
  page_id: string;
  name: string;
  image?: string;
  position: number;
  items?:[
    {
      entity_id?: string;
      group_id?: string;
      pos: number;
    }
  ]
}

export interface ActivityButtonUsage
{
  activity_id: string;
  name: string;
  button: string;
  short_press: boolean;
  double_press: boolean;
}

export interface ButtonMapping
{
  button: string;
  short_press?: Command;
  long_press?: Command;
  double_press?: Command;
}

export interface ActivityPageCommand
{
  type: "text"|"icon"|"media_player";
  text?: string;
  icon?: string;
  media_player_id?: string;
  command?: string | Command;
  location: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  }
}

export interface UIPage
{
  page_id?: string;
  name: string;
  grid: {
    width: number;
    height: number;
  }
  items: ActivityPageCommand[];
}

export interface ActivitySequenceUsage {
  activity_id: string;
  sequence_type: string;
  cmd_id: string;
}


export interface Command
{
  entity_id: string;
  cmd_id: string;
  params?: any;
}

export interface CommandSequence
{
  type: string;
  delay?: number;
  command?: Command;
}

export interface ActivityOption
{
  sequences?:{[type: string]: CommandSequence[]};
  prevent_sleep?: boolean;
  included_entities?:Entity[];
  activity_group?: any;
  button_mapping?:ButtonMapping[];
  user_interface?: {
    pages?: UIPage[];
  }
}

export interface Activity {
  entity_id?: string;
  name: string;
  icon?: string;
  description?: any;
  options?: ActivityOption;
  attributes?: any;
}

export interface Macro {
  entity_id: string;
  entity_type: string;
  integration_id: string;
  name: LanguageName;
  icon?: string;
  description?: LanguageName;
  features?: string[];
  options?: {
    editable?: boolean;
    included_entities?: Entity[];
    sequence?: CommandSequence[];
  };
  attributes?: {[key: string] : string};
  device_class?: string;
}

export interface LanguageName {
  [key: 'en' | 'fr' | 'de' | string]: string;
}

export interface OrphanEntity extends Entity
{
  activities?: Activity[];
}

export interface Integration
{
  driver_id?: string
  integration_id: string
  name: LanguageName
  icon?: string
  driver_type: "LOCAL" | "CUSTOM" | "EXTERNAL"
  state: "NOT_CONFIGURED"| "UNKNOWN"| "IDLE"| "CONNECTING"| "CONNECTED"| "DISCONNECTED"| "RECONNECTING"| "ACTIVE"| "ERROR"
  device_state?: string
  driver_state?: string
}

export interface ScreenLayout
{
  grid: {
    default: {
      width: number;
      height: number;
    }
    min: {
      width: number;
      height: number;
    }
    max: {
      width: number;
      height: number;
    }
  }
}

export interface Driver
{
  driver_id: string
  developer_name?: string
  name: LanguageName
  icon?: string
  driver_type: "LOCAL" | "CUSTOM" | "EXTERNAL"
  driver_url?: string
  version: string;
  driver_state: "NOT_CONFIGURED"| "IDLE"| "CONNECTING"| "CONNECTED"| "DISCONNECTED"| "RECONNECTING"| "ACTIVE"| "ERROR"
  enabled: boolean
}

export interface RemoteData {
  remote: Remote;
  version: RemoteVersion | undefined;
  activities: Activity[]
  entities: Entity[]
  profiles: Profile[]
  macros: Macro[]
  configCommands: EntityCommand[]
  orphanEntities: OrphanEntity[]
  unusedEntities: Entity[]
  context: Context | undefined;
}

export interface RemoteVersion {
  model: string;
  device_name: string;
  hostname: string;
  address: string;
  api: string;
  core: string;
  ui: string;
  os: string;
}

export interface RemoteModel {
  model: string;
  name: string;
  buttons: string[];
}

export interface RemoteModels {
  models: RemoteModel[];
}

export interface BatteryState {
  status?: "CHARGING" | "DISCHARGING" | "NOT_CHARGING" | "FULL";
  capacity?: number;
  power_supply?: boolean;
}

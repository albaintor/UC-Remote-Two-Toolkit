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

export interface EntityCommand
{
  id: string;
  cmd_id: string;
  name: {
    en: string;
    fr?: string;
    de?: string
  }
  params: [
    {
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
    }
  ]
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
  api: string;
  body: any;
  status?: OperationStatus;
  message?: any;
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

export interface Entity
{
  name?: string | {'en': string, 'fr': string};
  entity_id?: string;
  entity_type: string;
  integration?: string;
  features?:string[];
  options?: {
    button_mapping?:ButtonMapping[];
    user_interface?: {
      pages?: UIPage[];
    }
    simple_commands?: string[];
  }
  foldername?: string;
  filename?: string;
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
      entity_id: string;
      position: number;
    }
  ]
}

export interface ActivityButtonUsage
{
  activity_id: string;
  name: string;
  button: string;
  short_press: boolean;
}

export interface Button
{
  button: string;
  entity_id: string;
  short_press: boolean;
}

export interface ButtonMapping
{
  button: string;
  short_press?: Command;
  long_press?: Command;
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

export interface ActivitySequence
{
  type: string;
  command?: Command;
}

export interface ActivityOption
{
  sequences?:{[type: string]: ActivitySequence[]};
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
  options?: ActivityOption;
}

export interface ActivityBackup {
  entity_id?: string;
  name: string;
  entities: Entity[];
  buttons: Button[];
  interface: UIPage[];
  sequences: ActivitySequenceUsage[];
  options?: ActivityOption;
}

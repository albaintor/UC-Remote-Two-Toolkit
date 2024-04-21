
export interface RemoteButtonMap
{
  button: string;
  cmd_id: string;
  feature: string;
  disabled?: boolean;
  long_press?: boolean;
  params?: any;
}

export interface RemotePageItem
{
  feature?: string;
  command: {
    cmd_id: string;
  }
  location?: {
    x?: number;
    y?: number;
  }
  type: "icon" | "text";
  icon?: string;
  text?: string;
}

export interface RemoteButtonPage
{
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
  type?: string;
}

export interface Entity
{
  // name?: string | {'en': string, 'fr': string};
  name?: string;
  entity_id?: string;
  entity_type: string;
  integration?: string;
  features?:string[];
  foldername?: string;
  filename?: string;
}

export interface EntitiesUsage
{
  [entity_id: string] : EntityUsage;
}

export interface ActivityEntity
{
  activity_id: string;
  name: string;
}

export interface ActivityInterface
{
  activity_id: string;
  name: string;
  page_id: string;
  page_name: string;
  command: string;
}

export interface EntityUsage
{
  name: string;
  type: string;
  activity_entities: ActivityEntity[];
  activity_buttons: BackupActivityButton[];
  activity_interface: ActivityInterface[];
  activity_sequences: Sequence[];
  pages: Page[];
}

export interface Profiles
{
  [profile_id: string] : Profile
}

export interface Profile
{
  name: string;
  filename : string;
  foldername: string;
  pages: Page[];
}

export interface Page {
  profile_id: string;
  filename: string;
  foldername: string;
  page_id: string;
  name: string;
}

export interface BackupActivityButton
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

export interface ActivityButtonMapping
{
  button: string;
  short_press?: Command;
  long_press?: Command;
}

export interface ActivityPageCommand
{
  entity_id: string;
  type: "text"|"icon";
  text?: string;
  media_player_id?: string;
  command?: string | Command;
  location: {
    x: number;
    y: number;
  }
}
export interface ActivityPage
{
  page_id: string;
  name: string;
  grid: {
    width: number;
    height: number;
  }
  items: ActivityPageCommand[];
}

export interface Sequence {
  activity_id: string;
  sequence_type: string;
  cmd_id: string;
  entity_id: string;
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
  sequences?:{[type: string]: ActivitySequence};
  included_entities?:Entity[];
  activity_group?: any;
  button_mapping?:ActivityButtonMapping[];
  user_interface?: {
    pages?: ActivityPage[];
  }
}

export interface Activity {
  activity_id?: string;
  entity_id?: string;
  name: string;
  entities: Entity[];
  buttons: Button[];
  interface: ActivityPage[];
  sequences: Sequence[];
  options?: ActivityOption;
}

export interface Activities {
  [activity_id: string] : Activity;
}

export interface Entities {
  [entity_id: string] : Entity;
}

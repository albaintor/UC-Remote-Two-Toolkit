export interface Config
{
  remotes?: Remote[];
}
export interface Remote
{
  name: string;
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
}

export interface Entity
{
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
  activity_buttons: ActivityButton[];
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

export interface ActivityButton
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

export interface ActivityPageCommand
{
  entity_id: string;
  command: string;
}
export interface ActivityPage
{
  page_id: string;
  name: string;
  items: ActivityPageCommand[];
}
export interface Sequence {
  activity_id: string;
  sequence_type: string;
  cmd_id: string;
  entity_id: string;
}
export interface Activity {
  activity_id?: string;
  name: string;
  entities: Entity[];
  buttons: Button[];
  interface: ActivityPage[];
  sequences: Sequence[];
}

export interface Activities {
  [activity_id: string] : Activity;
}

export interface Entities {
  [entity_id: string] : Entity;
}

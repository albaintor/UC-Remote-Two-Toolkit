import path from "path";
import fs from "node:fs";

let CONFIG_FOLDER = process.env["DATA_DIR"] || '..';
const CONFIG_FILE = 'config.json';

export function setConfig(configFolder: string)
{
  CONFIG_FOLDER = configFolder;
}

export function writeConfigFile(config: any)
{
  const filepath = path.join(CONFIG_FOLDER, CONFIG_FILE);
  console.log('Write config', filepath);
  fs.writeFileSync(filepath, JSON.stringify(config));
}

export function getConfigFile() {
  const filepath = path.join(CONFIG_FOLDER, CONFIG_FILE);
  console.log('Read config', filepath);
  if (!fs.existsSync(filepath)) {
    return {};
  }
  const config_file = fs.readFileSync(filepath, 'utf-8');
  if (!config_file) return {};
  return JSON.parse(config_file);
}

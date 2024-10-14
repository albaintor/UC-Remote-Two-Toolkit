import path from "path";
import fs from "node:fs";

const DATA_DIR = process.env.DATA_DIR || '.';
const CONFIG_FOLDER = DATA_DIR;
const CONFIG_FILE = 'config.json';

export function writeConfigFile(config)
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

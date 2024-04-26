# Unfolded Circle Remote Two Toolkit

This project is aimed to bring further functionalities to [Remote Two Web Configurator](https://www.unfoldedcircle.com)
It is developed in Angular for the front-end, and NodeJS for the back-end. This project is all-in-one with the front and the back-end, so no need to add any additional components.
![image](https://github.com/albaintor/UC-Remote-Two-Toolkit/assets/118518828/7015272c-0fb6-4d9e-85bb-e6cbab632e64)

## Pre-requisites
- NodeJS >= 21

## Setup

The program is organized as followed :
- src -> Front-end in Angular
- angular.json -> Front end
- package.json -> Front end
- ...
- server\* -> Back-end in NodeJS


Download a release and extract it in a folder. Then launch a command prompt

### Setup and compilation of the front-end
From root folder, to setup the front-end by installing angular libraries and the front-end dependencies
`npm install`

Build the front-end : this command will compile the front-end and generated the build files to `server\public` subfolder

`npm run-script build`

### Setup and build of the back-end
`cd server`

`npm install`

## Run the program (from server subfolder)
`cd server`

`npm start`

Launch your web browser and go to `http://localhost:8000`

## Usage

- First register a Remote Two by clicking on `Manage Remotes` : type in the IP and 4 digits token of your remote. This is only needed once, a private key will be stored for further access.
- Click on `Load remote entities` or `Load remote resources` to retrieve all entities and activities and resources (custom icons). This data will be stored in your browser and can be accessed again later without retrieving data again. Of course if you modify the remote configuration, you should retrieve data again.
- You can add additional remotes and switch from one to another if necessary from the dropdown on the right side

Then you can start using the program :

- You can check after all antities in activities : orphan entities will be displayed in red
- If you click on an entity inside an activity, a new section will display where this entity is used in all other activities and UI pages

### Modification of an activity

From the main page, if you click on an activity name or ID, a popup will show up with the configured buttons mapping and pages
![image](https://github.com/albaintor/UC-Remote-Two-Toolkit/assets/118518828/b91e9b31-8a6d-4ed3-b937-0aad0b18e324)
![image](https://github.com/albaintor/UC-Remote-Two-Toolkit/assets/118518828/477491a8-c13b-4a89-b0ab-b211ffd24e32)

If you click on the button `Edit this activity`, it will brings you to another page where you can :
- View the updated configuration (buttons and interface) by clicking on `View new activity`
  - Reorder each item in each page like in the web configurator
  - Modify each item [in progress]
  - Modify each button [in progress]
- Apply pre-defined mapping from a given entity : for example if you select a media player entity, it will assign buttons according to the media player features (volume up/down to volume up/down buttons if the media player supports volume control, cursor up/left/right/down/center to corresponding buttons if it supports direction pad...), as well as predefined interface buttons. This mapping is realized from a template defined in the front end in `src/assets/remote/remote-map.json`. For now I have predefined mapping for media player entities and IR remotes. Note that this mapping can be tuned by user on the fly : you can unselect features to prevent mapping of some buttons, and you can prevent to overwrite already assigned buttons or not. In that way you can repeat the process for the same activity for other entities.
- Replace one entity by another in the activity : useful if you have duplicated an activity where you want the same mapping (buttons & interface) but with another device (e.g you have 2 Android TVs or 2 Apple TVs)

Once you have applied all your modifications, they are in local : you just have to click on `Save activity to remote` : it will shows all the operations that will be applied to the remote. You can have a final check before clicking on `Update remote` to update the Remote Two.



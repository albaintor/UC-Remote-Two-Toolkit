# Unfolded Circle Remote Two Toolkit

This project is aimed to bring further functionalities to [Remote Two Web Configurator](https://www.unfoldedcircle.com)
It is developed in Angular for the front-end, and NodeJS for the back-end. This project is all-in-one with the front and the back-end, so no need to add any additional components.
![image](https://github.com/albaintor/UC-Remote-Two-Toolkit/assets/118518828/7015272c-0fb6-4d9e-85bb-e6cbab632e64)

## Pre-requisites
- NodeJS >= 21

## Installation

The released are available for 2 systems :
- Windows
- Ubuntu

Just download the package for your system and execute the binary :
- r2tool-server.exe for Windows
- r2tool-server for Linux

Then launch your browser to http://localhost:8000
You can change the listening port by adding `--port <port number>` argument

## Usage

### First : register a remote

- First register a Remote by clicking on `Manage Remotes` : type in the IP and 4 digits token of your remote. This is only needed once, a private key will be stored for further access.
- Click on `Load remote entities` or `Load remote resources` to retrieve all entities and activities and resources (custom icons). This data will be stored in your browser and can be accessed again later without retrieving data again. Of course if you modify the remote configuration, you should retrieve data again.
- You can add additional remotes and switch from one to another if necessary from the dropdown on the right side
- Select a remote in the dropdown (a refresh may be necessary)

### Navigation
![image](https://github.com/user-attachments/assets/f75dd2a3-175e-4fa9-a779-f8e7eb95e152)

- `Manage Remotes` : add (register) or remove a remote from registration
- `Load Remote Data` : load entities, activities and profils (UI pages) from the selected remote (in the drop down list)
- `Load Remote Resources` : load remote custom resources (pictures) from the selected remote
- `Replace Entities` : replace an entity by another in all activities and pages. Useful if an entity has changed of name/id, or the driver and you have orphan entities which are not usable anymore
- `Load activity from file` : after saving an activity to a (json format) file from the ![image](https://github.com/user-attachments/assets/fe10c03b-7d98-4c70-a077-3878aa3281c9)
 button you can import it. If the activity already exists, it will replace it, otherwise it will create it. Useful if you want to restore an activity after unexpected changes, or if you want to clone an activity from one remote to another remote.

Main page :
- You can check after all antities : orphan entities (defined in activities but not linked to any active integration), as well as unused entities
- If you click on an activity, you can review it on a popup and edit it (see next sections)
- If you click on an entity inside an activity, a new section will display where this entity is used in all other activities and UI pages


### Replace an entity by another

**! Be sure to make a backup before proceeding. I won't be responsible of any loss of data !**

Sometimes, 
- when you move an integration from external to internal : the driver changes its identifier, and so are the entities too so that you won't recover your mappings in the activities
- when the driver itself changes its identifier
- when the device changes its identifier (e.g the IP which was part of the ID changed, or the mac address when switching from wifi to lan)
- when you just want to switch from one device to another in all the activities

To perform a replacement of all commands (buttons and UI interface) from one entity to another :
- Click on `Replace entities` on the menu bar
- Click on `Load Remote data` to download all the entities & activities
- You should see all the entities in a table
- Select the "old" entity you want to be replaced in the table
- Then in the same table, select the "new" entity to replace to
- You can repeat these two steps for all the other entities you want to replace : you should consider to do all of the replacements in the same sequence because if one entity is orphan (and should be replaced), then the updates will fail
- Click on `Submit`
- A popup will appear will all the pending operations to perform to the remote
- You can check the list of operations and if you want to proceed : click on `Update remote`

All done !


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
- Save the activity to a file (before doing modifications and restore it later, or to import it to another remote)
- Import an activity from a file to the same remote or another remote
- Copy a UI page to clipboard
- Paste a UI page from clipboard : note that with this feature you can copy a page from one activity to another or even to another remote

Once you have applied all your modifications, they are in local : you just have to click on `Save activity to remote` : it will shows all the operations that will be applied to the remote. You can have a final check before clicking on `Update remote` to update the Remote Two.



## Compilation

If you want to build the program by yourself.
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


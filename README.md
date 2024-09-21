# Unfolded Circle Remote Two Toolkit

This project is aimed to bring further functionalities to [Remote Two Web Configurator](https://www.unfoldedcircle.com)
It is developed in Angular for the front-end, and NodeJS for the back-end. This project is all-in-one with the front and the back-end, so no need to add any additional components.
![Capture d'écran 2024-09-13 080938](https://github.com/user-attachments/assets/1507a5de-7c9b-4e15-a85d-7f02be322644)


## Pre-requisites
- NodeJS >= 21

## Installation

The released are available for 2 systems :
- Windows
- Ubuntu

Just download the package for your system and execute the binary :
- ucrtool-server.exe for Windows
- ucrtool-server for Linux

Then launch your browser to http://localhost:8000
You can change the listening port by adding `--port <port number>` argument

## Usage

### First : register a remote

- First register a Remote by clicking on `Manage Remotes` : type in the hostname or IP and 4 digits token of your remote. This is only needed once, a private key will be stored for further access.
- Click on `Load remote entities` or `Load remote resources` to retrieve all entities and activities and resources (custom icons). This data will be stored locally and can be accessed again later without retrieving data again.
- You can add additional remotes and switch from one to another if necessary from the dropdown on the right side
- Select a remote in the dropdown (a refresh may be necessary)

### Navigation
![image](https://github.com/user-attachments/assets/3bfa90af-401f-4c1e-89df-3cd9e9a31d31)

- `Manage Remotes` : add (register) or remove a remote from registration
- `Integrations` : review installed integrations, upload a custom driver or delete one. Review the subscribed entities per integration
- `Load Remote` : load entities, activities and profiles (UI pages) from the selected remote (in the drop down list), load custom resources (icons & pictures)
- `Replace Entities` : replace an entity by another in all activities and pages. Useful if an entity has changed of name/id, or the driver and you have orphan entities which are not usable anymore
- `Import activity` : import an activity from a file after saving it to a (json format) file or from clipboard. Activities can be imported in another remote as long as the used entities are available. If the activity already exists, it will replace it, otherwise it will create it
- `Backup & restore` : backup the remote to a file or restore it from a saved backup. Same functionality as in the web configurator
- `Sync activities` : synchronize activties between 2 remotes

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

If you click on the button `Edit this activity`, it will brings you to another page where you can :
- Reorder each item in each page like in the web configurator
- Modify each UI item, create new UI items, create new pages
- (Re)assign each button
- Copy / paste a page : to the same or to another activity, to the same or to another remote
- Copy / paste a selection of items as well
- Apply pre-defined mapping from a given entity : for example if you select a media player entity, it will assign buttons according to the media player features (volume up/down to volume up/down buttons if the media player supports volume control, cursor up/left/right/down/center to corresponding buttons if it supports direction pad...), as well as predefined interface buttons. This mapping is realized from a template defined in the front end in `src/assets/remote/remote-map.json`. For now I have predefined mapping for media player entities and IR remotes. Note that this mapping can be tuned by user on the fly : you can unselect features to prevent mapping of some buttons, and you can prevent to overwrite already assigned buttons or not. In that way you can repeat the process for the same activity for other entities.
- Replace one entity by another in the activity : useful if you have duplicated an activity where you want the same mapping (buttons & interface) but with another device (e.g you have 2 Android TVs or 2 Apple TVs)
- Save the activity to a file (before doing modifications and restore it later, or to import it to another remote)
- Import an activity from a file to the same remote or another remote


<img width="100%" alt="Activity menu" src="https://github.com/user-attachments/assets/c0a248f7-72e8-4bc5-aee4-407808616a00">

![image](https://github.com/user-attachments/assets/803355d0-874f-42dc-bf7f-d3a8fdcd94b0)

<img width="60%" alt="UI grid" src="https://github.com/albaintor/UC-Remote-Two-Toolkit/assets/118518828/b91e9b31-8a6d-4ed3-b937-0aad0b18e324">

Once you have applied all your modifications, they are not stored yet in the remote : you just have to click on `Save activity to remote` : it will shows all the operations that will be applied to the remote. You can have a final check before clicking on `Update remote` to update the Remote Two.

## Synchronization of activities

This section lets you compare and synchronize activities between 2 remotes. First select one (source) remote and another (target) remote.
Click on analyse : a table will display the identical, different or missing activities between the 2 remotes with the details on the differences (different buttons assignment, sequences, UI pages).
You can click on an activity and it will display the details on the 2 remotes.

Then select the activities you want to synchronize (from one remote to another).
The integrations and entities must be configured first on the target remote, otherwise a warning will be displayed. In that case you can eventually replace orphan entities by other existing on the target remote.

<img width="100%" alt="UI grid" src="https://github.com/user-attachments/assets/f40c524c-bc26-4ce3-b823-33fafdbb60f1">


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


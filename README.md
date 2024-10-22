# Unfolded Circle Remote Two Toolkit

This project is aimed to bring further functionalities to [Remote Two Web Configurator](https://www.unfoldedcircle.com)
It is developed in Angular for the front-end, and NodeJS for the back-end. This project is all-in-one with the front and the back-end, so no need to add any additional components.

![image](https://github.com/user-attachments/assets/61c8c289-a6f9-42d3-bb4a-2f90c660c9ae)


![image](https://github.com/user-attachments/assets/82a09018-2325-4bf9-b7d9-e29f11caaa48)


## Pre-requisites
- NodeJS >= 22 if your are running the pre-compiled binary or wants to compile it
- Docker if you want to run the docker image (from a NAS, PC, Raspberry....)

## Installation

The releases are available for 4 systems :
- Windows
- Ubuntu
- MacOS (with an ARM CPU)
- Docker image

Just download the package for your system and execute the binary :
- ucrtool-server.exe for Windows
- ucrtool-server for Linux or MacOS
- Docker image : `docker pull albator78/uc-tool:latest`

Then launch your browser to http://localhost:8000
You can change the listening port by adding `--port <port number>` argument

For docker image, you can configure an external directory on your PC to store the configuration and resources files (that you won't loose when you'll update the image).
Just configure a mounting point and define `DATA_DIR` configuration variable to this mounting directory :

<img width="50%" alt="Docker container settings" src="https://github.com/user-attachments/assets/38ef7141-c94f-43a1-80fa-b33ca5eaaab2">



## Usage

### First : register a remote

- First register a Remote by clicking on `Manage Remotes` : type in the hostname or IP and 4 digits token of your remote. This is only needed once, a private key will be stored for further access.
- Click on `Load remote entities` or `Load remote resources` to retrieve all entities and activities and resources (custom icons). This data will be stored locally and can be accessed again later without retrieving data again.
- You can add additional remotes and switch from one to another if necessary from the dropdown on the right side
- Select a remote in the dropdown (a refresh may be necessary)

### Navigation

![image](https://github.com/user-attachments/assets/61c8c289-a6f9-42d3-bb4a-2f90c660c9ae)

- `Manage Remotes` : add (register) or remove a remote from registration
- `Integrations` : review installed integrations, upload a custom driver or delete one. Review the subscribed entities per integration
- `Load Remote` : load entities, activities and profiles (UI pages) from the selected remote (in the drop down list), load custom resources (icons & pictures)
- `Replace Entities` : replace an entity by another in all activities and pages. Useful if an entity has changed of name/id, or the driver and you have orphan entities which are not usable anymore
- `Import activity` : import an activity from a file after saving it to a (json format) file or from clipboard. Activities can be imported in another remote as long as the used entities are available. If the activity already exists, it will replace it, otherwise it will create it
- `Backup & restore` : backup the remote to a file or restore it from a saved backup. Same functionality as in the web configurator
- `Sync activities` : synchronize activties between 2 remotes
- `Edit pages` : edit global UI pages (profiles with pages)
- `Play remote` : display and configure and play dashboards of active entities (media players, lights and covers) with virtual remotes of activities as if you were holding the physical remote.

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


## Media player widget

When the remote is connected, a widget will be displayed in overlay and will be filled in by active media player entities. It is possible to execute media player commands based on its capabilities, or to switch to another active media player entity.

Also in this page it will display all the active media entities and it is possible to execute commands on them

<img width="40%" alt="UI grid" src="https://github.com/user-attachments/assets/370ca38a-ca99-4891-8b98-436e1b58ceab">

If the remote is disconnected, you can click on the status to send a wake on lan packet and trigger a reconnection.


## Dashboards and virtual remote

From the `Play Remote` link, you can :
- See dynamically the active media entities : as soon as an event occurs (media content change, button press, UI command...), the entity will appear as a card
- Each (media) entity content is dynamically updated : title, artwork, position, volume.... and you can trigger commands from the card
- You can add additional (media players, lights, covers) entities from the drop down list in the menu bar
- You can also add virtual remotes of any activities. Any running activity will be displayed as a button in the menu bar and clicking on it will raise its virtual remote.
- Each virtual remote can be added from the activity dropdown and will be displayed as a popup dialog. It can be minimized or dismissed. This virtual remote will reproduce the exacct same behaviour of the (physical) remote, including : button mapping (including long press if you make a long click on the button), UI mapping, UI page switching, and media entities with artwork, scrolling title/album/artist, media position and seeking, volume position and update

<img width="100%" alt="UI grid" src="https://github.com/user-attachments/assets/7078a8c3-040a-4bff-99f4-ce093e60843b">

You can also reorganize the cards and save the view (list of cards and list of virtual remotes) to the cache of the navigator in order to reload it later.


## Edit UI pages

It is possible to edit UI pages from the `Edit pages` menu link.
You can :
- Reorder entities or groups within pages
- Remove or add entities or groups to pages
- Reorder pages within a given profile
- Backup and restore a profile (with all pages and groups) to and from a file

<img width="100%" alt="Edit UI pages" src="https://github.com/user-attachments/assets/6b62c105-2381-42e2-b837-d521b6e83542">


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


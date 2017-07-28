# Framework
Node.js + Express.js + Angualr.js + socket.io

# Installation 

## Run: 
Install VirtualBox, Vagrant and Chrome.

Doadload and run Muzicodes[https://github.com/cgreenhalgh/musiccodes]

On Windows double-click/run `musiccodes.bat`

Enter bootstrap folder of Muzicodes

vagrant up

vagrant ssh

cd /vagrant

In 'vagrant': get MuziVisual[https://github.com/littlebugivy/muzivisual]

Run: node muzivisual/app/server.js

## Default port
Muzicodes : localhost:3000

MuziVisual: localhost:8000
		 
# Logs

Writes client usage logs to `app/logs`. Log file name is time created, i.e. time server (re)started.

Files are UTF-8, newline-separated; each line is a JSON log record.

Each event has:
- `time` - UNIX time (ms)
- `datetime` - ISO time
- `component` - name of component logging message, typ. `server`, `loguse` or `loguse:USERID` (i.e. client app).
- `event` - name of event (see below)
- `info` - JSON object with event-specific information (see below)

Main event types:
- `log.start` - first record in file, includes information about program and version
- `http.listen` - `port` being listened on by server
- `loguse.client.add` - a new client has connected for logging use (allocates new USER ID - note IDs not persisted across server restarts)
- `loguse.client.visible` - client app view visible (e.g. opened or unlocked or returned to after visiting another page)
- `loguse.client.hidden` - client app view hidden (e.g. closed, locked or navigated to another page)
- `loguse.client.view` - `path` of app now being viewed
- `loguse.client.log` - some other log event from client

# Requirements
## Version 1.0 for June performance
Doc: [https://github.com/cgreenhalgh/fast-performance-demo/edit/master/docs/appnotes.md] (uplate later)

## Version 2.0 for London performance
### Design purpose
Find out what contents are useful/paid attention to by audiences

### Design principle
Allow the audieneces to choose what they want to look at

### Pre-performance
Offers all the info about the performance in the first place 

Have a top menu with links to 8 materials:
- Performer info
- Programme note
- What you can see (Stage settings)
	- Projections
	- Disklavier
	- Audio Effect
	- Mobile app 
- How it works (Technical perspective)
- Archive (post-perf, text needed)
- Performance1 (button)
- Performance2 (button)
- A static overview map

### Performance
Use the same animation as Version 1.0 (post-reveal)

Particularly in the 2nd performance, the map displays a fade path of the 1st perf for distinguish purpose


### Post-performance
Have same content as Version 1.0 (colored path on map + journey summary)

Differenetly, both paths can be viewed on the same map (highlight one and fade the other)

### Others
Use one link for two performances (url ?p1=xxx ?p2=xxx)

No automatic navigation to performances (use probably highlighted links on the top menu instead)

During the performance, audiences can always flip back to the top menu

### Future extesion
Interactivity?



# Framework
Node.js + Express.js + Angualr.js + socket.io

# Installation 

## Prerequisites: 
Install VirtualBox, Vagrant and Chrome.

Doadload and run Muzicodes[https://github.com/cgreenhalgh/musiccodes]

On Windows double-click/run `musiccodes.bat`
Enter bootstrap folder of Muzicodes
vagrant up
vagrant ssh
cd /vagrant

## Run
In 'vagrant': get MuziVisual[https://github.com/littlebugivy/muzivisual]
Run: node muzivisual/app/server.js

## Default port
Muzicodes : localhost:3000
MuziVisual: localhost:8000
		 
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




